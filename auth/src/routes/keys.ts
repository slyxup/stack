import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { projects } from '../lib/schema';
import { requireDeveloper } from '../middleware/developer';
import { createKeySchema } from '../schemas/keys';
import { writeAuditLog } from '../services/audit.service';
import * as ProjectService from '../services/project.service';

const keys = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { developerId?: string; userId?: string };
}>();

// Deduplicated: shared developer auth (session → verified user → developer)
keys.use('*', requireDeveloper);

keys.post('/', zValidator('json', createKeySchema), async (c) => {
  const input = c.req.valid('json');
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const member = await ProjectService.isProjectMember(
    c.env,
    input.projectId,
    developerId
  );
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const project = await getDb(c.env)
    .select({ environment: projects.environment })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .get();
  if (!project) return c.json({ ok: false, error: 'Project not found' }, 404);
  // Keys always match the project's current mode. Clients cannot request a
  // live key for a test project or a test key for a live project.
  let key: Awaited<ReturnType<typeof ProjectService.createApiKey>>;
  try {
    key = await ProjectService.createApiKey(c.env, {
      projectId: input.projectId,
      name: input.name,
      type: input.type,
    });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create key',
      },
      409
    );
  }
  void writeAuditLog(
    c.env,
    'key.created',
    {
      projectId: input.projectId,
      userId: c.get('userId') ?? null,
      ipAddress: c.req.header('CF-Connecting-IP') ?? null,
      userAgent: c.req.header('User-Agent') ?? null,
    },
    { keyId: key.id, name: key.name, type: key.type }
  );
  // full key returned ONLY here
  return c.json(
    { ok: true, id: key.id, key: key.key, prefix: key.prefix },
    201
  );
});

keys.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const member = await ProjectService.isProjectMember(
    c.env,
    projectId,
    developerId
  );
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const list = await ProjectService.listApiKeys(c.env, projectId);
  // never return hashedKey
  return c.json({
    ok: true,
    keys: list.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      type: k.type,
      createdAt: k.createdAt,
    })),
  });
});

keys.delete('/:id', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const keyId = c.req.param('id');
  const key = await ProjectService.getApiKeyById(c.env, keyId);
  if (!key) return c.json({ ok: false, error: 'Not found' }, 404);
  const member = await ProjectService.isProjectMember(
    c.env,
    key.projectId,
    developerId
  );
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  await ProjectService.revokeApiKey(c.env, keyId);
  void writeAuditLog(
    c.env,
    'key.revoked',
    {
      projectId: key.projectId,
      userId: c.get('userId') ?? null,
      ipAddress: c.req.header('CF-Connecting-IP') ?? null,
      userAgent: c.req.header('User-Agent') ?? null,
    },
    { keyId, name: key.name }
  );
  return c.json({ ok: true });
});

export default keys;
