import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getSessionToken } from '../lib/cookies';
import { randomToken } from '../lib/crypto';
import { getDb } from '../lib/db';
import { auditLogs, webhookEndpoints } from '../lib/schema';
import { getSession } from '../services/auth.service';

const audit = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { userId: string };
}>();

/** Require admin session (deduplicated) */
audit.use('*', async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const data = await getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  if (data.user.role !== 'admin')
    return c.json({ ok: false, error: 'Admin required' }, 403);
  c.set('userId', data.user.id);
  await next();
});

// ── Audit Logs ──
audit.get('/logs', async (c) => {
  const projectId = c.req.query('projectId');
  const action = c.req.query('action');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const db = getDb(c.env);

  let query = db.select().from(auditLogs).$dynamic();
  if (projectId) query = query.where(eq(auditLogs.projectId, projectId));
  if (action)
    query = query.where(
      eq(
        auditLogs.action,
        action as NonNullable<(typeof auditLogs.$inferInsert)['action']>
      )
    );
  const logs = await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .all();

  return c.json({
    ok: true,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
  });
});

// ── Webhook Endpoints CRUD ──
audit.get('/webhooks', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);
  const db = getDb(c.env);
  const list = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.projectId, projectId))
    .all();
  return c.json({
    ok: true,
    webhooks: list.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events ?? [],
      isActive: w.isActive,
    })),
  });
});

audit.post('/webhooks', async (c) => {
  const body = await c.req
    .json<{ projectId?: string; url?: string; events?: string[] }>()
    .catch(() => ({ projectId: undefined, url: undefined, events: undefined }));
  if (!body.projectId || !body.url)
    return c.json({ ok: false, error: 'projectId and url required' }, 400);
  const secret = `whsec_${randomToken(24)}`;
  const db = getDb(c.env);
  const wh = {
    id: crypto.randomUUID(),
    projectId: body.projectId,
    url: body.url,
    secret,
    events: body.events ?? ['*'],
    isActive: true,
    createdAt: new Date(),
  };
  await db.insert(webhookEndpoints).values(wh);
  return c.json(
    { ok: true, id: wh.id, url: wh.url, secret, events: wh.events },
    201
  );
});

audit.delete('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  return c.json({ ok: true });
});

export default audit;
