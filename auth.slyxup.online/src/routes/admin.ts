import { zValidator } from '@hono/zod-validator';
import { asc, count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { apiKeys, projects, sessions, users } from '../lib/schema';
import { requireSecretKey } from '../middleware/auth';
import {
  createApiKey,
  getApiKeyById,
  getProject,
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

  // Get user IDs from project_members
  const memberRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.projectId, projectId))
    .all();
  const userIds = [...new Set(memberRows.map((r) => r.userId))];

  if (userIds.length === 0) {
    return c.json({ ok: true, users: [], total: 0 });
  }

  // Fetch user details (paginated)
  const userList = await db
    .select()
    .from(users)
    .where(eq(users.projectId, projectId))
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// ── GET /v1/admin/sessions — list active sessions ──
admin.get('/sessions', async (c) => {
  const projectId = c.get('projectId');
  const db = getDb(c.env);
  const nowSec = Math.floor(Date.now() / 1000);
  const list = await db
    .select()
    .from(sessions)
    .where(eq(sessions.projectId, projectId))
    .orderBy(desc(sessions.createdAt))
    .limit(100)
    .all();
  return c.json({
    ok: true,
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

export default admin;
