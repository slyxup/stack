import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from './lib/db';
import { checkRateLimit } from './lib/rate-limit';
import { projects } from './lib/schema';
import adminRoute from './routes/admin';
import auditRoute from './routes/audit';
import auth from './routes/auth';
import developersRoute from './routes/developers';
import keysRoute from './routes/keys';
import oauthRoute from './routes/oauth';
import projectsRoute from './routes/projects';
import sessionsRoute from './routes/sessions';
import usersRoute from './routes/users';
import verificationRoute from './routes/verification';

// SlyxUp Auth Worker — CF Workers + D1 + KV
// Deploy: https://auth.slyxup.online (wrangler deploy)
// API: /v1/*  Hosted Pages: /sign-in etc.
// NOTE: Billing lives ONLY in billing.slyxup.online (separate Worker + D1).

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Max-Age': '86400',
  };

  let allow =
    !!origin &&
    (allowed.includes(origin) || allowed.includes('*') || isLocalhost);

  // Dynamic: custom domains registered on LIVE projects (KV-cached 60s).
  // Any platform built with the SDK gets CORS automatically — no redeploy.
  if (!allow && origin.startsWith('https://')) {
    try {
      let hosts: string[] | null = null;
      const cached = await c.env.KV.get('cors_live_domains');
      if (cached) {
        hosts = JSON.parse(cached) as string[];
      } else {
        const db = getDb(c.env);
        const rows = await db
          .select({ domains: projects.allowedDomains })
          .from(projects)
          .where(eq(projects.environment, 'live'))
          .all();
        hosts = [
          ...new Set(
            rows.flatMap((r) => (Array.isArray(r.domains) ? r.domains : []))
          ),
        ];
        await c.env.KV.put('cors_live_domains', JSON.stringify(hosts), {
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
      console.error(
        JSON.stringify({ evt: 'cors_domain_lookup_failed', msg: String(e) })
      );
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
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

// Rate limiting on auth endpoints
app.use('/v1/auth/*', async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const rl = await checkRateLimit(c.env.KV, `auth:${ip}`, 20, 60);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.resetIn),
        },
      }
    );
  }
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'auth.slyxup.online',
    runtime: 'cloudflare',
  })
);
app.get('/v1/health', (c) => c.json({ ok: true, db: !!c.env.DB }));

app.route('/v1/auth', auth);
app.route('/v1/user', usersRoute);
app.route('/v1/verification', verificationRoute);
app.route('/v1/projects', projectsRoute);
app.route('/v1/keys', keysRoute);
app.route('/v1/developers', developersRoute);
app.route('/v1/oauth', oauthRoute);
app.route('/v1/sessions', sessionsRoute);
app.route('/v1/admin', adminRoute);
app.route('/v1/audit', auditRoute);
app.route('/v1', auth); // also mount session at /v1/session

export default {
  fetch(
    request: Request,
    env: Bindings & Record<string, unknown>,
    ctx: ExecutionContext
  ) {
    return app.fetch(request, env, ctx);
  },
};
