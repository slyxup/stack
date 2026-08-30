import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from '../lib/cookies';
import { sanitizeUser } from '../lib/sanitize';
import { signIn2FASchema, signInSchema, signUpSchema } from '../schemas/auth';
import { writeAuditLog } from '../services/audit.service';
import * as AuthService from '../services/auth.service';
import { verifyApiKey } from '../services/project.service';
import { dispatchWebhooks } from '../services/webhook.service';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

async function resolveProjectId(c: {
  req: { header: (n: string) => string | undefined };
  env: { DB: D1Database };
}): Promise<string | null | 'INVALID'> {
  const pk =
    c.req.header('X-Publishable-Key') ?? c.req.header('x-publishable-key');
  if (!pk) return null; // no key = platform bootstrap (developer first-auth) — allowed
  const info = await verifyApiKey(c.env, pk);
  if (!info) return 'INVALID';
  if (info.type !== 'publishable') return 'INVALID';
  return info.projectId;
}

auth.post('/sign-up', zValidator('json', signUpSchema), async (c) => {
  const input = c.req.valid('json');
  const resolved = await resolveProjectId(
    c as unknown as {
      req: { header: (n: string) => string | undefined };
      env: { DB: D1Database };
    }
  );
  if (resolved === 'INVALID') {
    return c.json(
      {
        ok: false,
        code: 'INVALID_PUBLISHABLE_KEY',
        error: 'Invalid publishable key',
      },
      401
    );
  }
  // If a valid publishable key was sent, scope the new user to its project
  // (overrides any body projectId to prevent cross-project spoofing)
  const projectId = resolved ?? input.projectId;
  try {
    const { sessionToken, expiresAt, user } = await AuthService.signUp(c.env, {
      ...input,
      projectId,
    });
    void dispatchWebhooks(c.env, projectId ?? null, 'user.created', {
      id: user.id,
      email: user.email,
    });
    void writeAuditLog(
      c.env,
      'user.created',
      {
        projectId: projectId ?? null,
        userId: user.id,
        ipAddress: c.req.header('CF-Connecting-IP') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
      },
      { email: user.email }
    );
    setSessionCookie(c, sessionToken, expiresAt);
    return c.json({ ok: true, user, sessionToken }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

auth.post('/sign-in', zValidator('json', signInSchema), async (c) => {
  const input = c.req.valid('json');
  const resolved = await resolveProjectId(
    c as unknown as {
      req: { header: (n: string) => string | undefined };
      env: { DB: D1Database };
    }
  );
  if (resolved === 'INVALID') {
    return c.json(
      {
        ok: false,
        code: 'INVALID_PUBLISHABLE_KEY',
        error:
          'Invalid publishable key — check NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY',
      },
      401
    );
  }
  const projectId = resolved ?? input.projectId;
  try {
    const result = await AuthService.signIn(c.env, {
      ...input,
      projectId,
    });
    if (result.requires2FA) {
      return c.json(
        {
          ok: false,
          code: '2FA_REQUIRED',
          error: 'Two-factor authentication required',
          challengeToken: result.challengeToken,
        },
        403
      );
    }
    const { user, sessionToken, expiresAt } = result;
    setSessionCookie(c, sessionToken, expiresAt);
    void dispatchWebhooks(c.env, user.projectId, 'user.signed_in', {
      id: user.id,
      email: user.email,
    });
    void writeAuditLog(
      c.env,
      'user.signed_in',
      {
        projectId: user.projectId,
        userId: user.id,
        ipAddress: c.req.header('CF-Connecting-IP') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
      },
      { email: user.email }
    );
    return c.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      // Bearer token for server-to-server / console usage (cookies are
      // SameSite=Lax and do not travel cross-origin)
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    if (msg === 'EMAIL_NOT_VERIFIED')
      return c.json(
        {
          ok: false,
          code: 'EMAIL_NOT_VERIFIED',
          error:
            'Please verify your email before signing in. Check your inbox, or resend via POST /v1/verification/resend.',
        },
        403
      );
    if (msg.startsWith('ACCOUNT_BLOCKED'))
      return c.json(
        { ok: false, code: 'ACCOUNT_BLOCKED', error: 'Account blocked' },
        403
      );
    return c.json({ ok: false, error: msg }, 401);
  }
});

// Complete a 2FA-enabled sign-in with a TOTP code or recovery code.
auth.post('/sign-in/2fa', zValidator('json', signIn2FASchema), async (c) => {
  const { challengeToken, code, recoveryCode } = c.req.valid('json');
  try {
    const result = await AuthService.complete2FASignIn(
      c.env,
      challengeToken,
      code,
      recoveryCode
    );
    setSessionCookie(c, result.sessionToken, result.expiresAt);
    void dispatchWebhooks(c.env, result.user.projectId, 'user.signed_in', {
      id: result.user.id,
      email: result.user.email,
    });
    void writeAuditLog(
      c.env,
      'user.signed_in',
      {
        projectId: result.user.projectId,
        userId: result.user.id,
        ipAddress: c.req.header('CF-Connecting-IP') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
      },
      { email: result.user.email, method: '2fa' }
    );
    return c.json({
      ok: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
      },
      sessionToken: result.sessionToken,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    if (msg === 'INVALID_2FA_CODE')
      return c.json(
        { ok: false, code: 'INVALID_2FA_CODE', error: 'Invalid code' },
        401
      );
    return c.json({ ok: false, error: msg }, 400);
  }
});

auth.post('/sign-out', async (c) => {
  const token = getSessionToken(c);
  if (token) {
    // Get session info before destroying for audit log
    const sessionData = await AuthService.getSession(c.env, token);
    await AuthService.signOut(c.env, token);
    if (sessionData) {
      void writeAuditLog(c.env, 'user.signed_out', {
        projectId: sessionData.user.projectId,
        userId: sessionData.user.id,
        ipAddress: c.req.header('CF-Connecting-IP') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
      });
    }
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get('/session', async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'No session' }, 401);
  const data = await AuthService.getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
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
    },
    session: { id: data.session.id, expiresAt: data.session.expiresAt },
  });
});

auth.get('/user', async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'No session' }, 401);
  const data = await AuthService.getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  return c.json({ ok: true, user: sanitizeUser(data.user) });
});

export default auth;
