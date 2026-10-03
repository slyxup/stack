import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { sanitizeUser } from '../lib/sanitize';
import { oauthAccounts, sessions, userProfiles, users } from '../lib/schema';
import { requireDeveloper } from '../middleware/developer';
import { writeAuditLog } from '../services/audit.service';
import { isProjectMember } from '../services/project.service';

function reqMeta(c: {
  req: { header: (n: string) => string | undefined };
}) {
  return {
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  };
}

// ── Project-scoped user management ──
// Mounted at /v1/projects/:id/users — replaces the global admin panel model.
// A developer must be a member of the project to read/write its users.
const app = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { developerId?: string; userId?: string };
}>();

app.use('*', requireDeveloper);

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
      blocked: users.blocked,
      blockedReason: users.blockedReason,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      hasPassword: users.passwordHash,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
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

  const oauthRows = rows.length
    ? await db
        .select({
          userId: oauthAccounts.userId,
          provider: oauthAccounts.provider,
        })
        .from(oauthAccounts)
        .where(
          inArray(
            oauthAccounts.userId,
            rows.map((row) => row.id)
          )
        )
        .all()
    : [];
  const providersByUser = new Map<string, string[]>();
  for (const row of oauthRows) {
    const providers = providersByUser.get(row.userId) ?? [];
    if (!providers.includes(row.provider)) providers.push(row.provider);
    providersByUser.set(row.userId, providers);
  }

  return c.json({
    ok: true,
    users: rows.map(({ hasPassword, ...row }) => ({
      ...row,
      authMethod: hasPassword ? 'email_password' : 'oauth',
      oauthProviders: providersByUser.get(row.id) ?? [],
    })),
    total: countRow?.total ?? 0,
  });
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
    .select({
      provider: oauthAccounts.provider,
      createdAt: oauthAccounts.createdAt,
    })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId));

  const authMethod = user.passwordHash ? 'email_password' : 'oauth';
  const safeUser = sanitizeUser(user);

  return c.json({
    ok: true,
    user: {
      ...safeUser,
      blockedReason: user.blockedReason,
      authMethod,
      passwordEnabled: Boolean(user.passwordHash),
    },
    profile: profile ?? null,
    sessionCount: sessRow?.count ?? 0,
    oauthProviders: oauth.map((o) => ({
      provider: o.provider,
      createdAt: o.createdAt,
    })),
  });
});

// ── User sessions (project-scoped admin view) ──
app.get('/:id/users/:userId/sessions', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const db = getDb(c.env);
  const sessionsForUser = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      projectId: sessions.projectId,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.projectId, id),
        gt(sessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(sessions.updatedAt))
    .all();

  return c.json({
    ok: true,
    sessions: sessionsForUser.map((session) => ({
      id: session.id,
      userId: session.userId,
      projectId: session.projectId,
      ip: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastSeenAt: session.updatedAt,
    })),
  });
});

app.delete('/:id/users/:userId/sessions/:sessionId', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.param('userId');
  const sessionId = c.req.param('sessionId');
  const db = getDb(c.env);
  const session = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        eq(sessions.projectId, id)
      )
    )
    .get();
  if (!session) return c.json({ ok: false, error: 'Session not found' }, 404);
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  return c.json({ ok: true });
});

// ── Edit user (name, email, role, block state) ──
const editUserSchema = zValidator(
  'json',
  z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().trim().toLowerCase().optional(),
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
  void writeAuditLog(
    c.env,
    'user.updated',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { userId, fields: Object.keys(input) }
  );
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
  void writeAuditLog(
    c.env,
    'user.blocked',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { userId, reason: body.reason ?? null }
  );
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
  void writeAuditLog(
    c.env,
    'user.unblocked',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { userId }
  );
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
  void writeAuditLog(
    c.env,
    'user.deleted',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { userId }
  );
  return c.json({ ok: true });
});

export default app;
