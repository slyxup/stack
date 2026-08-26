import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createKeySchema } from '../schemas/keys';
import * as ProjectService from '../services/project.service';
import { ensureDeveloper, userFromSession } from './developers';

const keys = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { developerId?: string };
}>();

// SECURITY: verified-user session Bearer only (see routes/developers.ts)
keys.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(c.env, auth.slice(7).trim());
  if (!user)
    return c.json(
      {
        ok: false,
        error:
          'Sign in with a verified SlyxUp account (POST /v1/auth/sign-in).',
      },
      401
    );
  try {
    const dev = await ensureDeveloper(c.env, user);
    c.set('developerId', dev.id);
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : 'Forbidden' },
      403
    );
  }
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
