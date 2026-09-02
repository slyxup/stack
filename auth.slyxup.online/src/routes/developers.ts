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

/** Resolve session Bearer → verified user (shared helper). Deduplicated via auth.service getSession. */
export async function userFromSession(
  env: { DB: D1Database },
  token: string
): Promise<{ id: string; email: string } | null> {
  const { getSession } = await import('../services/auth.service');
  const data = await getSession(env, token);
  if (!data) return null;
  return { id: data.user.id, email: data.user.email };
}

/** Ensure a developer row exists for this user; return it. */
export async function ensureDeveloper(
  env: { DB: D1Database } & Record<string, string | undefined>,
  user: { id: string; email: string }
) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(developers)
    .where(eq(developers.userId, user.id))
    .get();
  if (existing) return existing;

  // ── Single-tenant guard: only admins can become developers on personal instances ──
  // Docs/public SDK stays open, but dashboard/project creation is owner-only.
  // Others must self-host. See bootstrap.service isSingleTenant().
  const singleTenant =
    (env.SINGLE_TENANT_MODE ?? env.ALLOW_PUBLIC_DEVELOPER_REGISTRATION) !==
    undefined
      ? env.SINGLE_TENANT_MODE === 'true' ||
        env.ALLOW_PUBLIC_DEVELOPER_REGISTRATION === 'false'
      : true; // default safe = single tenant
  if (singleTenant) {
    const u = await db.select().from(users).where(eq(users.id, user.id)).get();
    // Only the first admin (role=admin) may claim developer. Non-admins get docs-only.
    // In single-tenant mode, project users (with projectId) never become developers.
    if (!u || u.role !== 'admin') {
      throw new Error(
        'Developer registration is disabled on this instance. Please self-host your own SlyxUp Stack — see https://stack.slyxup.online/docs for setup. Docs and SDK remain public.'
      );
    }
    // Also enforce email whitelist if BOOTSTRAP_ADMIN_EMAIL is set
    const allowed = (
      env.BOOTSTRAP_ADMIN_EMAIL ?? env.INITIAL_ADMIN_EMAIL
    )?.toLowerCase();
    if (allowed && u.email.toLowerCase() !== allowed) {
      throw new Error('Developer access restricted to instance owner.');
    }
  }

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

/** Middleware — session Bearer or HttpOnly cookie required; auto-provisions developer row. */
developersRoute.use('*', async (c, next) => {
  const { getSessionToken } = await import('../lib/cookies');
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(c.env, token);
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
