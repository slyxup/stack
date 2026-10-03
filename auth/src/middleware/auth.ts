import { createMiddleware } from 'hono/factory';
import { getSessionToken } from '../lib/cookies';
import { getSession, type SessionUser } from '../services/auth.service';
import { verifyApiKey } from '../services/project.service';

type Env = {
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: {
    userId: string;
    sessionToken: string;
    /** Full user row loaded by getSession — lets handlers skip re-fetching it. */
    sessionUser: SessionUser | undefined;
    projectId: string;
    keyEnvironment: string;
  };
};

export const requireSession = createMiddleware<Env>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const data = await getSession(c.env, token, {
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  });
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  const key = c.req.header('X-Publishable-Key');
  if (key) {
    const project = await verifyApiKey(c.env, key);
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
  c.set('userId', data.user.id);
  c.set('sessionToken', token);
  c.set('sessionUser', data.user);
  await next();
});

/**
 * requireSecretKey — verifies Authorization: Bearer sk_xxx.
 * Sets projectId and keyEnvironment on context for downstream handlers.
 * Rejects pk keys and session tokens.
 */
export const requireSecretKey = createMiddleware<Env>(async (c, next) => {
  const auth = c.req.header('Authorization');
  const sk = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;
  if (!sk || !/^sk_[A-Za-z0-9]+$/.test(sk)) {
    return c.json(
      {
        ok: false,
        error: 'Secret key required (Authorization: Bearer sk_...)',
      },
      401
    );
  }
  const info = await verifyApiKey(c.env, sk);
  if (!info) {
    return c.json({ ok: false, error: 'Invalid secret key' }, 401);
  }
  if (info.type !== 'secret') {
    return c.json({ ok: false, error: 'Key is not a secret key' }, 401);
  }
  c.set('projectId', info.projectId);
  c.set('keyEnvironment', info.environment);
  await next();
});
