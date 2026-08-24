import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { addMemberSchema, createProjectSchema } from '../schemas/projects';
import * as ProjectService from '../services/project.service';

const projects = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { developerId?: string };
}>();

// Developer auth middleware (Bearer token = developerId for now; CLI flow)
projects.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const developerId = auth.slice(7).trim();
  const dev = await ProjectService.getDeveloperById(c.env, developerId);
  if (!dev) return c.json({ ok: false, error: 'Invalid developer token' }, 401);
  c.set('developerId', dev.id);
  await next();
});

projects.post('/', zValidator('json', createProjectSchema), async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const input = c.req.valid('json');
  try {
    const project = await ProjectService.createProject(
      c.env,
      developerId,
      input
    );
    return c.json({ ok: true, project }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

projects.get('/', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const list = await ProjectService.listProjects(c.env, developerId);
  return c.json({ ok: true, projects: list });
});

projects.get('/:id', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const project = await ProjectService.getProject(c.env, id);
  if (!project) return c.json({ ok: false, error: 'Not found' }, 404);
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  return c.json({ ok: true, project });
});

export default projects;
