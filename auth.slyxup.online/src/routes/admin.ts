import { desc, eq, like, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { projects, sessions, users } from '../lib/schema';

const admin = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { userId: string };
}>();

/** Middleware — require admin role */
admin.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const token = auth.slice(7).trim();
  const db = getDb(c.env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session) return c.json({ ok: false, error: 'Invalid session' }, 401);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  if (!user || user.role !== 'admin')
    return c.json({ ok: false, error: 'Admin required' }, 403);
  c.set('userId', user.id);
  await next();
});

admin.post('/users/:id/block', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req
    .json<{ reason?: string }>()
    .catch(() => ({ reason: undefined as string | undefined }));
  const db = getDb(c.env);
  await db
    .update(users)
    .set({
      blocked: true,
      blockedReason: body.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return c.json({ ok: true });
});

admin.post('/users/:id/unblock', async (c) => {
  const userId = c.req.param('id');
  const db = getDb(c.env);
  await db
    .update(users)
    .set({ blocked: false, blockedReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return c.json({ ok: true });
});

admin.post('/users/:id/role', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req
    .json<{ role?: string }>()
    .catch(() => ({ role: undefined }));
  if (!body.role || !['user', 'admin'].includes(body.role))
    return c.json({ ok: false, error: 'role must be user or admin' }, 400);
  const db = getDb(c.env);
  await db
    .update(users)
    .set({ role: body.role as 'user' | 'admin', updatedAt: new Date() })
    .where(eq(users.id, userId));
  return c.json({ ok: true, role: body.role });
});

// ── Dashboard: platform stats (identity only — billing stats live in
//    billing.slyxup.online) ──
admin.get('/stats', async (c) => {
  const db = getDb(c.env);
  const [userCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      verified: sql<number>`sum(case when email_verified = 1 then 1 else 0 end)`,
      blocked: sql<number>`sum(case when blocked = 1 then 1 else 0 end)`,
      admins: sql<number>`sum(case when role = 'admin' then 1 else 0 end)`,
    })
    .from(users);
  const [sessionCount] = await db
    .select({ active: sql<number>`count(*)` })
    .from(sessions)
    .where(sql`${sessions.expiresAt} > unixepoch()`);
  const [projectCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(projects);
  return c.json({
    ok: true,
    users: userCounts,
    activeSessions: sessionCount?.active ?? 0,
    projects: projectCount?.total ?? 0,
  });
});

// ── Users list with search + pagination ──
admin.get('/users', async (c) => {
  const q = (c.req.query('q') ?? '').toLowerCase();
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = Number(c.req.query('offset') ?? 0);
  const db = getDb(c.env);
  const where = q ? like(users.email, `%${q}%`) : undefined;
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
  return c.json({ ok: true, users: rows });
});

export default admin;
