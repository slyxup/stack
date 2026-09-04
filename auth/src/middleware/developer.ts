import { createMiddleware } from 'hono/factory';
import { getSessionToken } from '../lib/cookies';
import { ensureDeveloper, userFromSession } from '../routes/developers';

/**
 * Deduplicated developer-auth middleware.
 * Single source of truth for: session → verified user → developer row.
 * Previously duplicated inline in keys.ts / projects.ts / project-users.ts / developers.ts.
 */
export const requireDeveloper = createMiddleware<{
  Bindings: {
    DB: D1Database;
    SINGLE_TENANT_MODE?: string;
    ALLOW_PUBLIC_DEVELOPER_REGISTRATION?: string;
    BOOTSTRAP_ADMIN_EMAIL?: string;
    INITIAL_ADMIN_EMAIL?: string;
  };
  Variables: { developerId: string; userId: string };
}>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(
    c.env as unknown as { DB: D1Database },
    token
  );
  if (!user)
    return c.json(
      {
        ok: false,
        error:
          'Sign in with a verified SlyxUp account (POST /v1/auth/sign-in).',
      },
      401
    );
  try {
    const dev = await ensureDeveloper(
      c.env as unknown as { DB: D1Database } & Record<
        string,
        string | undefined
      >,
      user
    );
    c.set('developerId', dev.id);
    c.set('userId', user.id);
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : 'Forbidden' },
      403
    );
  }
  await next();
});
