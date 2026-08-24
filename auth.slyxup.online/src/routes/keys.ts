import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createKeySchema } from '../schemas/keys';
import * as ProjectService from '../services/project.service';

const keys = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { developerId?: string };
}>();

keys.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const developerId = auth.slice(7).trim();
  const dev = await ProjectService.getDeveloperById(c.env, developerId);
  if (!dev) return c.json({ ok: false, error: 'Invalid developer token' }, 401);
  c.set('developerId', dev.id);
  await next();
});

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
  await ProjectService.revokeApiKey(c.env, c.req.param('id'));
  return c.json({ ok: true });
});

export default keys;
