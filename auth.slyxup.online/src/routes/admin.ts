import { zValidator } from '@hono/zod-validator';
import { and, count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { apiKeys, projects, sessions, users } from '../lib/schema';
import { requireSecretKey } from '../middleware/auth';
import { blockUser, unblockUser } from '../services/admin.service';
import { listAuditLogs } from '../services/audit.service';
import {
  createApiKey,
  getApiKeyById,
  listApiKeys,
  revokeApiKey,
} from '../services/project.service';

type Env = {
  Bindings: { DB: D1Database };
  Variables: { projectId: string; keyEnvironment: string };
};

const admin = new Hono<Env>();

// All routes require a valid secret key
admin.use('*', requireSecretKey);

// ── GET /v1/admin/project — current project details ──
admin.get('/project', async (c) => {
  const projectId = c.get('projectId');
  const db = getDb(c.env);
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!project) return c.json({ ok: false, error: 'Project not found' }, 404);
  return c.json({
    ok: true,
    project: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
    },
  });
});

// ── GET /v1/admin/users — list users in the project ──
admin.get('/users', async (c) => {
  const projectId = c.get('projectId');
  const db = getDb(c.env);
  const rawLimit = Number(c.req.query('limit') ?? 50);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
    100
  );
  const rawOffset = Number(c.req.query('offset') ?? 0);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const search = c.req.query('search')?.trim();

  // Build query with optional search
  let query = db.select().from(users).$dynamic();
  const conditions = [eq(users.projectId, projectId)];
  if (search) {
    // Search by email prefix or name
    conditions.push(
      eq(users.email, search) // exact match fallback
    );
  }
  query = query.where(and(...conditions));

  const userList = await query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.projectId, projectId))
    .all();

  return c.json({
    ok: true,
    total,
    limit,
    offset,
    users: userList.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      emailVerified: u.emailVerified,
      blocked: u.blocked,
      blockedReason: u.blockedReason,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
});

// ── GET /v1/admin/users/:id — single user details ──
admin.get('/users/:id', async (c) => {
  const projectId = c.get('projectId');
  const userId = c.req.param('id');
  const db = getDb(c.env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  return c.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      blocked: user.blocked,
      blockedReason: user.blockedReason,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// ── POST /v1/admin/users/:id/block — block a user ──
admin.post('/users/:id/block', async (c) => {
  const projectId = c.get('projectId');
  const userId = c.req.param('id');
  const db = getDb(c.env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  const body = await c.req
    .json<{ reason?: string }>()
    .catch(() => ({ reason: undefined }));
  await blockUser(c.env, userId, body.reason, {
    projectId,
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  });
  return c.json({ ok: true });
});

// ── POST /v1/admin/users/:id/unblock — unblock a user ──
admin.post('/users/:id/unblock', async (c) => {
  const projectId = c.get('projectId');
  const userId = c.req.param('id');
  const db = getDb(c.env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  await unblockUser(c.env, userId, {
    projectId,
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  });
  return c.json({ ok: true });
});

// ── DELETE /v1/admin/users/:id — delete a user ──
admin.delete('/users/:id', async (c) => {
  const projectId = c.get('projectId');
  const userId = c.req.param('id');
  const db = getDb(c.env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  // Delete user's sessions first
  await db.delete(sessions).where(eq(sessions.userId, userId));
  // Delete user
  await db.delete(users).where(eq(users.id, userId));
  return c.json({ ok: true });
});

// ── GET /v1/admin/sessions — list active sessions ──
admin.get('/sessions', async (c) => {
  const projectId = c.get('projectId');
  const db = getDb(c.env);
  const rawLimit = Number(c.req.query('limit') ?? 50);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
    100
  );
  const rawOffset = Number(c.req.query('offset') ?? 0);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const nowSec = Math.floor(Date.now() / 1000);

  const list = await db
    .select()
    .from(sessions)
    .where(eq(sessions.projectId, projectId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const [{ total }] = await db
    .select({ total: count() })
    .from(sessions)
    .where(eq(sessions.projectId, projectId))
    .all();

  return c.json({
    ok: true,
    total,
    limit,
    offset,
    sessions: list.map((s) => ({
      id: s.id,
      userId: s.userId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      isExpired: s.expiresAt.getTime() / 1000 < nowSec,
      createdAt: s.createdAt,
    })),
  });
});

// ── DELETE /v1/admin/sessions/:id — revoke a specific session ──
admin.delete('/sessions/:id', async (c) => {
  const projectId = c.get('projectId');
  const sessionId = c.req.param('id');
  const db = getDb(c.env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();
  if (!session || session.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  return c.json({ ok: true });
});

// ── DELETE /v1/admin/sessions — revoke all sessions for a user ──
admin.delete('/sessions', async (c) => {
  const projectId = c.get('projectId');
  const userId = c.req.query('userId');
  if (!userId) return c.json({ ok: false, error: 'userId required' }, 400);
  const db = getDb(c.env);
  // Verify user belongs to this project
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return c.json({ ok: true });
});

// ── GET /v1/admin/keys — list API keys ──
admin.get('/keys', async (c) => {
  const projectId = c.get('projectId');
  const list = await listApiKeys(c.env, projectId);
  return c.json({
    ok: true,
    keys: list.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      environment: k.environment,
      type: k.type,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  });
});

// ── POST /v1/admin/keys — create API key ──
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['publishable', 'secret']),
  environment: z.enum(['test', 'live']),
});

admin.post('/keys', zValidator('json', createKeySchema), async (c) => {
  const projectId = c.get('projectId');
  const input = c.req.valid('json');
  const key = await createApiKey(c.env, {
    projectId,
    name: input.name,
    type: input.type,
    environment: input.environment,
  });
  return c.json(
    { ok: true, id: key.id, key: key.key, prefix: key.prefix },
    201
  );
});

// ── DELETE /v1/admin/keys/:id — revoke API key ──
admin.delete('/keys/:id', async (c) => {
  const projectId = c.get('projectId');
  const keyId = c.req.param('id');
  const key = await getApiKeyById(c.env, keyId);
  if (!key || key.projectId !== projectId) {
    return c.json({ ok: false, error: 'Not found' }, 404);
  }
  await revokeApiKey(c.env, keyId);
  return c.json({ ok: true });
});

// ── GET /v1/admin/audit — list audit logs ──
admin.get('/audit', async (c) => {
  const projectId = c.get('projectId');
  const action = c.req.query('action');
  const userId = c.req.query('userId');
  const rawLimit = Number(c.req.query('limit') ?? 50);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
    100
  );
  const rawOffset = Number(c.req.query('offset') ?? 0);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

  const { logs, total } = await listAuditLogs(c.env, {
    projectId,
    action: action ?? undefined,
    userId: userId ?? undefined,
    limit,
    offset,
  });

  return c.json({
    ok: true,
    total,
    limit,
    offset,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
    })),
  });
});

// ── GET /v1/admin/stats — project statistics ──
admin.get('/stats', async (c) => {
  const projectId = c.get('projectId');
  const db = getDb(c.env);
  const nowSec = Math.floor(Date.now() / 1000);

  const [userCount] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.projectId, projectId))
    .all();

  const [sessionCount] = await db
    .select({ total: count() })
    .from(sessions)
    .where(eq(sessions.projectId, projectId))
    .all();

  const [activeSessionCount] = await db
    .select({ total: count() })
    .from(sessions)
    .where(
      and(
        eq(sessions.projectId, projectId)
        // sessions.expiresAt > now
      )
    )
    .all();

  const [blockedCount] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.projectId, projectId), eq(users.blocked, true)))
    .all();

  const [verifiedCount] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.projectId, projectId), eq(users.emailVerified, true)))
    .all();

  const [keyCount] = await db
    .select({ total: count() })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId))
    .all();

  return c.json({
    ok: true,
    stats: {
      totalUsers: userCount.total,
      totalSessions: sessionCount.total,
      blockedUsers: blockedCount.total,
      verifiedUsers: verifiedCount.total,
      totalKeys: keyCount.total,
    },
  });
});

export default admin;
