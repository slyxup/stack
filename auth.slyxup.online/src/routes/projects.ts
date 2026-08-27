import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import {
  developers,
  projectDomains,
  projects as projectsTable,
} from '../lib/schema';
import { addMemberSchema, createProjectSchema } from '../schemas/projects';
import * as ProjectService from '../services/project.service';
import { ensureDeveloper, userFromSession } from './developers';

const projects = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { developerId?: string };
}>();

// SECURITY: developer auth = verified user session (no static tokens).
// Accepts both Authorization Bearer and HttpOnly cookie (via getSessionToken)
// so dashboard (SlyxUpProvider with credentials: include) works after refresh.
projects.use('*', async (c, next) => {
  const { getSessionToken } = await import('../lib/cookies');
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const user = await userFromSession(c.env, token);
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
  const db = getDb(c.env);
  const clean = body.domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
  if (body.action === 'add') {
    // Insert into scalable domains table (idempotent)
    const existing = await db
      .select()
      .from(projectDomains)
      .where(
        and(eq(projectDomains.projectId, id), eq(projectDomains.domain, clean))
      )
      .get();
    if (!existing) {
      await db.insert(projectDomains).values({
        id: crypto.randomUUID(),
        projectId: id,
        domain: clean,
        verified: false,
        createdAt: new Date(),
      });
    }
    // Keep JSON in sync for old clients
    const current = (project.allowedDomains ?? []) as string[];
    if (!current.includes(clean)) {
      const updated = [...current, clean];
      await db
        .update(projectsTable)
        .set({ allowedDomains: updated, updatedAt: new Date() })
        .where(eq(projectsTable.id, id));
    }
  } else {
    await db
      .delete(projectDomains)
      .where(
        and(eq(projectDomains.projectId, id), eq(projectDomains.domain, clean))
      );
    const current = (project.allowedDomains ?? []) as string[];
    const updated = current.filter((d) => d.toLowerCase() !== clean);
    await db
      .update(projectsTable)
      .set({ allowedDomains: updated, updatedAt: new Date() })
      .where(eq(projectsTable.id, id));
  }
  await c.env.KV.delete('cors_live_domains');
  const domains = await db
    .select({ domain: projectDomains.domain })
    .from(projectDomains)
    .where(eq(projectDomains.projectId, id))
    .all();
  return c.json({ ok: true, domains: domains.map((d) => d.domain) });
});

projects.get('/:id/domains', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const project = await ProjectService.getProject(c.env, id);
  if (!project) return c.json({ ok: false, error: 'Not found' }, 404);
  const db = getDb(c.env);
  const rows = await db
    .select({ domain: projectDomains.domain })
    .from(projectDomains)
    .where(eq(projectDomains.projectId, id))
    .all();
  // Merge JSON + table for backward compat, deduped
  const jsonDomains = (project.allowedDomains ?? []) as string[];
  const merged = [...new Set([...jsonDomains, ...rows.map((r) => r.domain)])];
  return c.json({
    ok: true,
    environment: project.environment,
    domains: merged,
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
