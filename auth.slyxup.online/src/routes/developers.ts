import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import { developers, sessions, users } from '../lib/schema';

/**
 * Developer identity — SECURITY MODEL
 *
 * There is NO open registration and NO password login on this router.
 * A developer account is only reachable through the main auth flow:
 *   1. POST /v1/auth/sign-up  (sends verification email)
 *   2. Verify email
 *   3. POST /v1/auth/sign-in  → session token (7d, DB-backed, revocable)
 *   4. Any /v1/developers/* or /v1/projects/* call with that Bearer token
 *
 * The developer row is provisioned automatically for a verified, signed-in
 * user. Unverified/blocked users can never reach these endpoints because
 * sign-in refuses them.
 */

const developersRoute = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { userId?: string; developerId?: string };
}>();

/** Resolve session Bearer → verified user (shared helper). */
export async function userFromSession(
  env: { DB: D1Database },
  token: string
): Promise<{ id: string; email: string } | null> {
  const db = getDb(env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session || session.expiresAt < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  if (!user || !user.emailVerified || user.blocked) return null;
  return { id: user.id, email: user.email };
}

/** Ensure a developer row exists for this user; return it. */
export async function ensureDeveloper(
  env: { DB: D1Database },
  user: { id: string; email: string }
) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(developers)
    .where(eq(developers.userId, user.id))
    .get();
  if (existing) return existing;
  // Reclaim legacy row created by the old CLI flow (same email, no link)
  const legacy = await db
    .select()
    .from(developers)
    .where(eq(developers.email, user.email))
    .get();
  if (legacy && !legacy.userId) {
    await db
      .update(developers)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(eq(developers.id, legacy.id));
    return { ...legacy, userId: user.id };
  }
  const now = new Date();
  const id = randomUUID();
  const emailTaken = !!legacy;
  if (!emailTaken) {
    await db.insert(developers).values({
      id,
      userId: user.id,
      email: user.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    return {
      id,
      userId: user.id,
      email: user.email,
      name: null,
      avatarUrl: null,
    };
  }
  throw new Error(
    'A legacy developer account already exists for this email — contact support to link it.'
  );
}

/** Middleware — session Bearer required; auto-provisions developer row. */
developersRoute.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(c.env, auth.slice(7).trim());
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
    const dev = await ensureDeveloper(c.env, user);
    c.set('userId', user.id);
    c.set('developerId', dev.id);
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : 'Forbidden' },
      403
    );
  }
  await next();
});

/** Current developer profile. */
developersRoute.get('/me', async (c) => {
  const db = getDb(c.env);
  const dev = await db
    .select()
    .from(developers)
    .where(eq(developers.id, c.get('developerId') ?? ''))
    .get();
  if (!dev) return c.json({ ok: false, error: 'Not found' }, 404);
  return c.json({
    ok: true,
    developer: { id: dev.id, email: dev.email, name: dev.name },
  });
});

/** Update profile (name). */
developersRoute.patch('/me', async (c) => {
  const body = await c.req
    .json<{ name?: string }>()
    .catch(() => ({ name: undefined }));
  const db = getDb(c.env);
  await db
    .update(developers)
    .set({ name: body.name ?? null, updatedAt: new Date() })
    .where(eq(developers.id, c.get('developerId') ?? ''));
  return c.json({ ok: true });
});

export default developersRoute;
