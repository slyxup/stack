import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireDeveloper } from '../middleware/developer';
import { createKeySchema } from '../schemas/keys';
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
  const key = await ProjectService.createApiKey(c.env, input);
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
      environment: k.environment,
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
  return c.json({ ok: true });
});

export default keys;
