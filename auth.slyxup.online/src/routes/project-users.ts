import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { sanitizeUser } from '../lib/sanitize';
import { oauthAccounts, sessions, userProfiles, users } from '../lib/schema';
import { isProjectMember } from '../services/project.service';
import { ensureDeveloper, userFromSession } from './developers';

// ── Project-scoped user management ──
// Mounted at /v1/projects/:id/users — replaces the global admin panel model.
// A developer must be a member of the project to read/write its users.
const app = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { developerId?: string };
}>();

app.use('*', async (c, next) => {
  const { getSessionToken } = await import('../lib/cookies');
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(c.env, token);
  if (!user)
    return c.json(
      { ok: false, error: 'Sign in with a verified SlyxUp account.' },
      401
    );
  try {
    const dev = await ensureDeveloper(c.env, user);
    c.set('developerId', dev.id);
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : 'Forbidden' },
      403
    );
  }
  await next();
});

// Project membership guard for every sub-route
app.use('/:id/*', async (c, next) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  await next();
});

// ── List users in a project ──
app.get('/:id/users', async (c) => {
  const id = c.req.param('id');
  const q = (c.req.query('q') ?? '').toLowerCase();
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = Number(c.req.query('offset') ?? 0);
  const db = getDb(c.env);
  const escapedQ = q
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  const where = q
    ? and(
        eq(users.projectId, id),
        sql`${users.email} LIKE ${`%${escapedQ}%`} ESCAPE '\\'`
      )
    : eq(users.projectId, id);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailVerified: users.emailVerified,
      blocked: users.blocked,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.projectId, id));

  return c.json({ ok: true, users: rows, total: countRow?.total ?? 0 });
});

// ── Single user detail (profile + sessions + oauth) ──
app.get('/:id/users/:userId', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const db = getDb(c.env);

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.projectId, id), eq(users.id, userId)))
    .get();
  if (!user) return c.json({ ok: false, error: 'Not found' }, 404);

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .get();

  const [sessRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const oauth = await db
    .select({ provider: oauthAccounts.provider })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId));

  return c.json({
    ok: true,
    user: sanitizeUser(user),
    profile: profile ?? null,
    sessionCount: sessRow?.count ?? 0,
    oauthProviders: oauth.map((o) => o.provider),
  });
});

// ── Edit user (name, email, role, block state) ──
const editUserSchema = zValidator(
  'json',
  z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(['user', 'admin']).optional(),
    blocked: z.boolean().optional(),
    blockedReason: z.string().max(500).optional(),
  })
);

app.patch('/:id/users/:userId', editUserSchema, async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const input = c.req.valid('json');
  const db = getDb(c.env);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.projectId, id), eq(users.id, userId)))
    .get();
  if (!existing) return c.json({ ok: false, error: 'Not found' }, 404);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.lastName !== undefined) patch.lastName = input.lastName;
  if (input.email !== undefined) patch.email = input.email;
  if (input.role !== undefined) patch.role = input.role;
  if (input.blocked !== undefined) {
    patch.blocked = input.blocked;
    patch.blockedReason = input.blocked ? (input.blockedReason ?? null) : null;
  }

  await db
    .update(users)
    .set(patch)
    .where(and(eq(users.projectId, id), eq(users.id, userId)));

  const updated = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return c.json({ ok: true, user: updated ? sanitizeUser(updated) : null });
});

// ── Block / Unblock ──
app.post('/:id/users/:userId/block', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const body = await c.req
    .json<{ reason?: string }>()
    .catch(() => ({ reason: undefined as string | undefined }));
  const db = getDb(c.env);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.projectId, id), eq(users.id, userId)))
    .get();
  if (!existing) return c.json({ ok: false, error: 'Not found' }, 404);
  await db
    .update(users)
    .set({
      blocked: true,
      blockedReason: body.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  // Revoke active sessions so a blocked user is logged out immediately
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return c.json({ ok: true });
});

app.post('/:id/users/:userId/unblock', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const db = getDb(c.env);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.projectId, id), eq(users.id, userId)))
    .get();
  if (!existing) return c.json({ ok: false, error: 'Not found' }, 404);
  await db
    .update(users)
    .set({ blocked: false, blockedReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return c.json({ ok: true });
});

// ── Delete user from project ──
app.delete('/:id/users/:userId', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const db = getDb(c.env);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.projectId, id), eq(users.id, userId)))
    .get();
  if (!existing) return c.json({ ok: false, error: 'Not found' }, 404);
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  return c.json({ ok: true });
});

export default app;
