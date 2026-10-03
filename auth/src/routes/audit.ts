import { eq } from 'drizzle-orm';
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
  const data = await getSession(c.env, token, {
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  });
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
  const limit = Math.min(Number(c.req.query('limit') ?? 50) || 50, 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0) || 0, 0);
  const { listAuditLogs } = await import('../services/audit.service');
  const { logs, total } = await listAuditLogs(c.env, {
    projectId: projectId || undefined,
    action: action || undefined,
    limit,
    offset,
  });

  return c.json({
    ok: true,
    total,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      // legacy names + dashboard names (both accepted by readers)
      userId: l.userId,
      actorId: l.userId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      ip: l.ipAddress,
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
