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
 * Validates the auth session by calling auth.slyxup.online /v1/session
 * (works for both local and prod without duplicating auth tables into billing D1).
 * Falls back to direct AUTH_DB read for performance when available.
 */
export const requireUser = createMiddleware<Env>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  // Try direct AUTH_DB read first (fast path for prod where tables exist)
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const row = await c.env.AUTH_DB.prepare(
      `SELECT s.user_id, u.email, u.blocked
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ? LIMIT 1`
    )
      .bind(token, nowSec)
      .first<SessionRow>();
    if (row) {
      if (row.blocked) return c.json({ ok: false, error: 'Blocked' }, 403);
      c.set('userId', row.user_id);
      c.set('userEmail', row.email);
      await next();
      return;
    }
  } catch {
    // AUTH_DB may not have auth tables in local dev (different Miniflare instance) — fall through to HTTP
  }

  // Fallback: call auth service via HTTP (no duplication, works for local dev with different D1 instances)
  try {
    const authUrl = c.env.AUTH_URL ?? 'https://auth.slyxup.online';
    const res = await fetch(`${authUrl}/v1/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      user?: { id: string; email: string };
    };
    if (!res.ok || !data.ok || !data.user) {
      return c.json({ ok: false, error: 'Invalid session' }, 401);
    }
    c.set('userId', data.user.id);
    c.set('userEmail', data.user.email);
    await next();
    return;
  } catch {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }
});

/** Bearer BILLING_ADMIN_SECRET guard for plan management (CLI / curl / dashboard-less ops)
 * Also allows project owners via their developer session (so dashboard can manage its own plans without the admin secret)
 */
export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const secret = c.env.BILLING_ADMIN_SECRET;
  const auth = c.req.header('Authorization');
  if (secret && auth === `Bearer ${secret}`) {
    await next();
    return;
  }
  // Fallback: allow project owner via session (dashboard UX) — try AUTH_DB first, then HTTP
  const token = getSessionToken(c);
  if (token) {
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const row = await c.env.AUTH_DB.prepare(
        'SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ? AND u.blocked = 0 LIMIT 1'
      )
        .bind(token, nowSec)
        .first<{ user_id: string }>();
      if (row) {
        c.set('userId', row.user_id);
        await next();
        return;
      }
    } catch {}
    try {
      const authUrl = c.env.AUTH_URL ?? 'https://auth.slyxup.online';
      const res = await fetch(`${authUrl}/v1/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { id: string };
      };
      if (res.ok && data.ok && data.user) {
        c.set('userId', data.user.id);
        await next();
        return;
      }
    } catch {}
  }
  return c.json({ ok: false, error: 'Unauthorized' }, 401);
});
