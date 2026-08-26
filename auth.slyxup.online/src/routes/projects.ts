import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { developers, projects as projectsTable } from '../lib/schema';
import { addMemberSchema, createProjectSchema } from '../schemas/projects';
import * as ProjectService from '../services/project.service';
import { ensureDeveloper, userFromSession } from './developers';

const projects = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { developerId?: string };
}>();

// SECURITY: developer auth = verified user session (no static tokens).
// Bearer token is a DB-backed 7-day session from /v1/auth/sign-in.
projects.use('*', async (c, next) => {
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

projects.patch('/:id/domains', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const body = await c.req
    .json<{ action: 'add' | 'remove'; domain: string }>()
    .catch(() => ({ action: undefined, domain: undefined }));
  if (!body.action || !body.domain)
    return c.json({ ok: false, error: 'action and domain required' }, 400);
  const project = await ProjectService.getProject(c.env, id);
  if (!project) return c.json({ ok: false, error: 'Not found' }, 404);
  const current = (project.allowedDomains ?? []) as string[];
  let updated: string[];
  if (body.action === 'add') {
    const clean = body.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (current.includes(clean)) return c.json({ ok: true, domains: current });
    updated = [...current, clean];
  } else {
    updated = current.filter((d) => d !== body.domain);
  }
  const db = getDb(c.env);
  await db
    .update(projectsTable)
    .set({ allowedDomains: updated, updatedAt: new Date() })
    .where(eq(projectsTable.id, id));
  await c.env.KV.delete('cors_live_domains');
  return c.json({ ok: true, domains: updated });
});

projects.get('/:id/domains', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const project = await ProjectService.getProject(c.env, id);
  if (!project) return c.json({ ok: false, error: 'Not found' }, 404);
  return c.json({
    ok: true,
    environment: project.environment,
    domains: project.allowedDomains ?? [],
  });
});

projects.post('/:id/go-live', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const db = getDb(c.env);
  await db
    .update(projectsTable)
    .set({ environment: 'live', updatedAt: new Date() })
    .where(eq(projectsTable.id, id));
  await c.env.KV.delete('cors_live_domains');
  return c.json({ ok: true, environment: 'live' });
});

export default projects;
