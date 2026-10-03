import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import {
  apiKeys,
  developers,
  projectDomains,
  projects as projectsTable,
  users,
} from '../lib/schema';
import { requireDeveloper } from '../middleware/developer';
import { projectEnvironmentSchema } from '../schemas/project-environment';
import { createProjectSchema } from '../schemas/projects';
import { listAuditLogs, writeAuditLog } from '../services/audit.service';
import * as ProjectService from '../services/project.service';

function reqMeta(c: {
  req: { header: (n: string) => string | undefined };
}) {
  return {
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  };
}

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
    void writeAuditLog(
      c.env,
      'project.created',
      {
        projectId: project.id,
        userId: c.get('userId') ?? null,
        ...reqMeta(c),
      },
      { name: project.name, slug: project.slug }
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

// Project-scoped audit timeline — what the dashboard Audit tab reads.
// (The legacy admin endpoint lives at GET /v1/audit/logs?projectId=.)
projects.get('/:id/audit', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const member = await ProjectService.isProjectMember(c.env, id, developerId);
  if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
  const project = await ProjectService.getProject(c.env, id);
  if (!project) return c.json({ ok: false, error: 'Not found' }, 404);
  const limit = Math.min(Number(c.req.query('limit') ?? 50) || 50, 100);
  const offset = Math.max(Number(c.req.query('offset') ?? 0) || 0, 0);
  const action = c.req.query('action') || undefined;
  const { logs, total } = await listAuditLogs(c.env, {
    projectId: id,
    action,
    limit,
    offset,
  });
  // Attach actor emails (best-effort) + normalize target fields for the UI.
  const db = getDb(c.env);
  const actorIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
  const emailById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { inArray } = await import('drizzle-orm');
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, actorIds as string[]))
      .all();
    for (const r of rows) emailById.set(r.id, r.email);
  }
  return c.json({
    ok: true,
    total,
    logs: logs.map((l) => {
      const meta = (l.metadata ?? {}) as Record<string, unknown>;
      const targetId =
        typeof meta.userId === 'string'
          ? meta.userId
          : typeof meta.keyId === 'string'
            ? meta.keyId
            : undefined;
      return {
        id: l.id,
        action: l.action,
        actorId: l.userId,
        actorEmail: (l.userId && emailById.get(l.userId)) || undefined,
        targetId,
        targetType: targetId
          ? l.action.startsWith('key.')
            ? 'key'
            : 'user'
          : undefined,
        metadata: l.metadata,
        ip: l.ipAddress,
        createdAt: l.createdAt,
      };
    }),
  });
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
  await c.env.KV.delete('cors_project_domains_v2');
  void writeAuditLog(
    c.env,
    body.action === 'add' ? 'domain.added' : 'domain.removed',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { domain: clean }
  );
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
  await db.delete(apiKeys).where(eq(apiKeys.projectId, id));
  await c.env.KV.delete('cors_project_domains_v2');
  void writeAuditLog(
    c.env,
    'project.environment_changed',
    {
      projectId: id,
      userId: c.get('userId') ?? null,
      ...reqMeta(c),
    },
    { environment: 'live' }
  );
  return c.json({ ok: true, environment: 'live' });
});

projects.patch(
  '/:id/environment',
  zValidator('json', projectEnvironmentSchema),
  async (c) => {
    const developerId = c.get('developerId');
    if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const member = await ProjectService.isProjectMember(c.env, id, developerId);
    if (!member) return c.json({ ok: false, error: 'Forbidden' }, 403);
    const { environment } = c.req.valid('json');
    const db = getDb(c.env);
    const updated = await db
      .update(projectsTable)
      .set({ environment, updatedAt: new Date() })
      .where(eq(projectsTable.id, id))
      .returning({ environment: projectsTable.environment })
      .get();
    if (!updated) return c.json({ ok: false, error: 'Not found' }, 404);
    await db.delete(apiKeys).where(eq(apiKeys.projectId, id));
    await c.env.KV.delete('cors_project_domains_v2');
    void writeAuditLog(
      c.env,
      'project.environment_changed',
      {
        projectId: id,
        userId: c.get('userId') ?? null,
        ...reqMeta(c),
      },
      { environment: updated.environment }
    );
    return c.json({ ok: true, environment: updated.environment });
  }
);

projects.delete('/:id', async (c) => {
  const developerId = c.get('developerId');
  if (!developerId) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  try {
    const proj = await ProjectService.getProject(c.env, id);
    const name = proj?.name ?? id;
    await ProjectService.deleteProject(c.env, id, developerId);
    await c.env.KV.delete('cors_project_domains_v2');
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
