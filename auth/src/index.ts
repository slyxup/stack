import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createBetterAuth } from './lib/better-auth';
import { getSessionToken } from './lib/cookies';
import { getDb } from './lib/db';
import {
  checkEndpointRateLimit,
  checkRateLimit,
  resolveEndpoint,
} from './lib/rate-limit';
import { log } from './lib/logger';
import { projects } from './lib/schema';
import { csrfMiddleware } from './middleware/csrf';
import adminRoute from './routes/admin';
import auditRoute from './routes/audit';
import auth from './routes/auth';
import developersRoute from './routes/developers';
import keysRoute from './routes/keys';
import oauthRoute from './routes/oauth';
import projectUsersRoute from './routes/project-users';
import projectsRoute from './routes/projects';
import sessionsRoute from './routes/sessions';
import setupRoute from './routes/setup';
import usersRoute from './routes/users';
import verificationRoute from './routes/verification';
import { getSession } from './services/auth.service';
import * as ProjectService from './services/project.service';

// SlyxUp Auth Worker — CF Workers + D1 + KV
// Deploy: `wrangler deploy` (URL comes from your Cloudflare account)
// API: /v1/*  Hosted Pages: /sign-in etc.
// NOTE: Billing lives ONLY in the separate Billing Worker + D1 (see billing/).

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
  BOOTSTRAP_SECRET?: string;
  ADMIN_BOOTSTRAP_TOKEN?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  INITIAL_ADMIN_EMAIL?: string;
  SINGLE_TENANT_MODE?: string;
  ALLOW_PUBLIC_DEVELOPER_REGISTRATION?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow configured origins + localhost dev + live project custom domains
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    origin
  );
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Publishable-Key, X-Secret-Key, X-Bootstrap-Token, X-CSRF-Token',
    // Browser JS must be able to read the CSRF token header (double-submit
    // echo) — without this, getResponseHeader('X-CSRF-Token') is null.
    'Access-Control-Expose-Headers': 'X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };

  let allow =
    !!origin &&
    (allowed.includes(origin) ||
      origin === new URL(c.req.url).origin ||
      isLocalhost ||
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.slyxup.com'));

  // Dynamic: custom domains registered on projects (KV-cached 60s). Test
  // projects need CORS too so their Sandbox auth/payment flow can be tested.
  // Reads BOTH the new project_domains table (scalable) and the legacy
  // projects.allowedDomains JSON for backward compat.
  if (!allow && origin.startsWith('https://')) {
    try {
      let hosts: string[] | null = null;
      const cached = await c.env.KV.get('cors_project_domains_v2');
      if (cached) {
        hosts = JSON.parse(cached) as string[];
      } else {
        const db = getDb(c.env);
        const jsonRows = await db
          .select({ domains: projects.allowedDomains })
          .from(projects)
           .all();
        const jsonHosts = jsonRows.flatMap((r) =>
          Array.isArray(r.domains) ? (r.domains as string[]) : []
        );
        // Scalable table — unlimited domains per project
        let tableHosts: string[] = [];
        try {
          const { projectDomains } = await import('./lib/schema');
          const tRows = await db
            .select({ domain: projectDomains.domain })
            .from(projectDomains)
            .innerJoin(projects, eq(projectDomains.projectId, projects.id))
             .all();
          tableHosts = tRows.map((r) => r.domain);
        } catch {
          /* table may not exist yet before migration 0007 */
        }
        hosts = [...new Set([...jsonHosts, ...tableHosts])];
        await c.env.KV.put('cors_project_domains_v2', JSON.stringify(hosts), {
          expirationTtl: 60,
        });
      }
      if (hosts) {
        let host = new URL(origin).hostname.toLowerCase();
        host = host.replace(/^www\./, '');
        allow = hosts.some(
          (h) => h.replace(/^www\./, '').toLowerCase() === host
        );
      }
    } catch (e) {
      log.warn('cors_domain_lookup_failed', { msg: String(e) });
    }
  }

  if (allow) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    corsHeaders.Vary = 'Origin';
  }
  if (c.req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }
  if (origin && !allow && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return c.json({ ok: false, error: 'Origin is not allowed' }, 403);
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

// CSRF protection on all mutation routes (after CORS, before rate limit).
// Safe methods mint the cookie; mutations require the X-CSRF-Token header.
app.use('/v1/*', csrfMiddleware);

// Per-endpoint rate limiting (Day 3). One middleware maps (method, path) →
// budget from RATE_LIMITS, so login/signup stay strict while reads stay generous.
app.use('/v1/*', async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const endpoint = resolveEndpoint(c.req.method, c.req.path);
  const rl = await checkEndpointRateLimit(c.env.KV, endpoint, ip);
  if (!rl.allowed) {
    return c.json(
      {
        ok: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Try again later.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.resetIn) },
      }
    );
  }
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'auth.slyxup.com',
    runtime: 'cloudflare',
  })
);
app.get('/v1/health', (c) =>
  c.json({ ok: true, db: !!c.env.DB, betterAuth: true })
);

// Public non-secret project metadata used by billing to select Paddle mode.
app.get('/v1/project-environment/:id', async (c) => {
  const project = await getDb(c.env)
    .select({ environment: projects.environment })
    .from(projects)
    .where(eq(projects.id, c.req.param('id')))
    .get();
  if (!project) return c.json({ ok: false, error: 'Project not found' }, 404);
  return c.json({ ok: true, environment: project.environment });
});

// Better-auth handler (audited, Argon2id, 2FA, admin) — mounted at /api/auth/*
app.all('/api/auth/*', async (c) => {
  const auth = createBetterAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route('/v1/auth', auth);
app.route('/v1/user', usersRoute);
app.route('/v1/verification', verificationRoute);
app.route('/v1/projects', projectsRoute);
app.route('/v1/projects', projectUsersRoute);
app.route('/v1/keys', keysRoute);
app.route('/v1/developers', developersRoute);
app.route('/v1/oauth', oauthRoute);
app.route('/v1/sessions', sessionsRoute);
app.route('/v1/admin', adminRoute);
app.route('/v1/audit', auditRoute);
app.route('/v1/setup', setupRoute);

// Public: resolve publishable key → projectId (used by billing Worker in local dev
// where AUTH_DB is a separate D1 instance without api_keys data).
// SECURITY: Prefer POST with JSON body {key} or X-Publishable-Key header — GET leaks keys via
// URL logs/brower history. GET kept for backwards compat but is now rate-limited.
async function handleKeyResolve(
  c: { env: unknown; json: (data: unknown, status?: number) => Response },
  rawKey: string | undefined
) {
  const key = rawKey?.trim();
  if (!key) return c.json({ ok: false, error: 'key required' }, 400);
  const info = await ProjectService.verifyApiKey(
    c.env as unknown as { DB: D1Database },
    key
  );
  if (!info || info.type !== 'publishable')
    return c.json({ ok: false, error: 'Invalid key' }, 404);
  return c.json({ ok: true, projectId: info.projectId });
}

app.get('/v1/key/resolve', async (c) => {
  const key = c.req.query('key');
  return handleKeyResolve(c, key);
});

app.post('/v1/key/resolve', async (c) => {
  // Prefer header, fallback to JSON body {key}
  const headerKey = c.req.header('X-Publishable-Key');
  let bodyKey: string | undefined;
  try {
    const body = (await c.req.json()) as { key?: string };
    bodyKey = body?.key;
  } catch {
    /* ignore — header-only call */
  }
  return handleKeyResolve(c, headerKey ?? bodyKey);
});

// Legacy SDK path — mount only the session endpoint at /v1/session (not the
// full auth router, which would bypass /v1/auth/* rate limiting).
app.get('/v1/session', async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'No session' }, 401);
  const data = await getSession(c.env, token, {
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  });
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  const key = c.req.header('X-Publishable-Key');
  if (key) {
    const project = await ProjectService.verifyApiKey(c.env, key);
    if (
      !project ||
      project.type !== 'publishable' ||
      project.projectId !== data.session.projectId
    ) {
      return c.json(
        { ok: false, error: 'Session does not belong to this project' },
        403
      );
    }
  }
  c.header('Cache-Control', 'no-store');
  return c.json({
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      name:
        data.user.firstName ||
        data.user.username ||
        data.user.email ||
        'Member',
      username: data.user.username ?? null,
      avatarUrl: data.user.avatarUrl ?? null,
      bio: data.user.bio ?? null,
      role: data.user.role,
      emailVerified: data.user.emailVerified,
      mustChangePassword:
        (data.user as unknown as { mustChangePassword?: boolean })
          .mustChangePassword ?? false,
    },
    session: { id: data.session.id, expiresAt: data.session.expiresAt },
  });
});

export default {
  fetch(
    request: Request,
    env: Bindings & Record<string, unknown>,
    ctx: ExecutionContext
  ) {
    return app.fetch(request, env, ctx);
  },
};
