import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import {
  developers,
  projectDomains,
  projects as projectsTable,
} from '../lib/schema';
import { requireDeveloper } from '../middleware/developer';
import { createProjectSchema } from '../schemas/projects';
import { writeAuditLog } from '../services/audit.service';
import * as ProjectService from '../services/project.service';

const projects = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { developerId?: string; userId?: string };
}>();

// Deduplicated developer auth — see middleware/developer.ts
projects.use('*', requireDeveloper);

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

projects.delete('/:id', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  try {
    const proj = await ProjectService.getProject(c.env, id);
    const name = proj?.name ?? id;
    await ProjectService.deleteProject(c.env, id, developerId);
    await c.env.KV.delete('cors_live_domains');
    void writeAuditLog(
      c.env,
      'project.deleted',
      {
        projectId: id,
        userId: c.get('userId') ?? null,
        ipAddress: c.req.header('CF-Connecting-IP') ?? null,
        userAgent: c.req.header('User-Agent') ?? null,
      },
      { name, projectId: id }
    );
    return c.json({ ok: true, deleted: id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    if (msg === 'Project not found')
      return c.json({ ok: false, error: msg }, 404);
    if (msg === 'Forbidden' || msg === 'Only project owner can delete')
      return c.json({ ok: false, error: msg }, 403);
    return c.json({ ok: false, error: msg }, 400);
  }
});

export default projects;
