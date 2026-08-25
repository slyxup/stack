import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { sessions, users } from '../lib/schema';

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

export default admin;
