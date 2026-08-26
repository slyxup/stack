import { createMiddleware } from 'hono/factory';

export type Env = {
  Bindings: {
    DB: D1Database;
    AUTH_DB: D1Database;
    KV: KVNamespace;
    APP_URL: string;
    AUTH_URL: string;
    API_URL: string;
    CORS_ORIGINS: string;
    PADDLE_ENVIRONMENT?: string;
    PADDLE_API_KEY?: string;
    PADDLE_WEBHOOK_SECRET?: string;
    BILLING_ADMIN_SECRET?: string;
  };
  Variables: { userId: string; userEmail: string };
};

export const SESSION_COOKIE = 'slyxup_session';

/** Session token from `slyxup_session` cookie or `Authorization: Bearer <token>` */
export function getSessionToken(c: {
  req: { header: (name: string) => string | undefined };
}): string | undefined {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return undefined;
}

interface SessionRow {
  user_id: string;
  email: string;
  blocked: number;
}

/**
 * Validates the auth.slyxup.online session directly against the slyxup_auth
 * database (AUTH_DB binding) — no cross-service HTTP hop. Sessions are the
 * single source of truth in auth; billing only reads them.
 */
export const requireUser = createMiddleware<Env>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  const nowSec = Math.floor(Date.now() / 1000);
  const row = await c.env.AUTH_DB.prepare(
    `SELECT s.user_id, u.email, u.blocked
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ? LIMIT 1`
  )
    .bind(token, nowSec)
    .first<SessionRow>();

  if (!row) return c.json({ ok: false, error: 'Invalid session' }, 401);
  if (row.blocked) return c.json({ ok: false, error: 'Blocked' }, 403);

  c.set('userId', row.user_id);
  c.set('userEmail', row.email);
  await next();
});

/** Bearer BILLING_ADMIN_SECRET guard for plan management (CLI / curl / dashboard-less ops) */
export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const secret = c.env.BILLING_ADMIN_SECRET;
  if (!secret)
    return c.json({ ok: false, error: 'Billing not configured' }, 501);
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${secret}`)
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  await next();
});
