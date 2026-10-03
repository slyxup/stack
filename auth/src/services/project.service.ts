import { and, eq, inArray } from 'drizzle-orm';
import { randomToken, randomUUID, sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  apiKeys,
  auditLogs,
  developers,
  projectDomains,
  projectMembers,
  projects,
  sessions,
  users,
  webhookEndpoints,
} from '../lib/schema';

// ── Developer (CLI) auth ──
export async function registerDeveloper(
  env: { DB: D1Database },
  input: { email: string; password: string; name?: string }
) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(developers)
    .where(eq(developers.email, input.email))
    .get();
  if (existing) throw new Error('Developer already exists');
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const dev = {
    id: randomUUID(),
    email: input.email,
    emailVerified: false,
    passwordHash,
    name: input.name ?? null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(developers).values(dev);
  return dev;
}

export async function loginDeveloper(
  env: { DB: D1Database },
  input: { email: string; password: string }
) {
  const db = getDb(env);
  const dev = await db
    .select()
    .from(developers)
    .where(eq(developers.email, input.email))
    .get();
  if (!dev || !dev.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(input.password, dev.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  return dev;
}

export async function getDeveloperById(env: { DB: D1Database }, id: string) {
  const db = getDb(env);
  return db.select().from(developers).where(eq(developers.id, id)).get();
}

// ── Projects ──
export async function createProject(
  env: { DB: D1Database },
  developerId: string,
  input: { name: string; slug: string; description?: string }
) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, input.slug))
    .get();
  if (existing) throw new Error('Slug already taken');
  const now = new Date();
  const project = {
    id: randomUUID(),
    developerId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(projects).values(project);
  // creator becomes owner member
  await db.insert(projectMembers).values({
    id: randomUUID(),
    projectId: project.id,
    developerId,
    role: 'owner',
    createdAt: now,
  });
  return project;
}

export async function listProjects(
  env: { DB: D1Database },
  developerId: string
) {
  const db = getDb(env);
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.developerId, developerId))
    .all();
  const ids = memberships.map((m) => m.projectId);
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, ids))
    .all();
  return rows;
}

export async function getProject(env: { DB: D1Database }, projectId: string) {
  const db = getDb(env);
  return db.select().from(projects).where(eq(projects.id, projectId)).get();
}

export async function isProjectMember(
  env: { DB: D1Database },
  projectId: string,
  developerId: string
) {
  const db = getDb(env);
  const m = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.developerId, developerId)
      )
    )
    .get();
  return !!m;
}

// ── API Keys ──
function generateKey(prefix: string): { full: string; raw: string } {
  const secret = randomToken(24);
  const full = `${prefix}_${secret}`;
  return { full, raw: full };
}

export async function createApiKey(
  env: { DB: D1Database },
  input: {
    projectId: string;
    name: string;
    type: 'publishable' | 'secret';
  }
) {
  const db = getDb(env);
  const project = await db
    .select({ environment: projects.environment })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .get();
  if (!project) throw new Error('Project not found');

  const existing = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(eq(apiKeys.projectId, input.projectId), eq(apiKeys.type, input.type))
    )
    .get();
  if (existing)
    throw new Error(
      `This project already has a ${input.type} key. Revoke it before creating a replacement.`
    );

  const prefix = input.type === 'publishable' ? 'pk' : 'sk';
  const { full, raw } = generateKey(prefix);
  const hashedKey = await sha256Hex(raw);
  const now = new Date();
  const key = {
    id: randomUUID(),
    projectId: input.projectId,
    name: input.name,
    prefix,
    hashedKey,
    environment: project.environment,
    type: input.type,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(apiKeys).values(key);
  return { ...key, key: full }; // only returned once at creation
}

export async function verifyApiKey(
  env: { DB: D1Database },
  rawKey: string
): Promise<{ projectId: string; type: string; environment: string } | null> {
  const db = getDb(env);
  const candidate = rawKey.trim();
  if (!/^(pk|sk)_[A-Za-z0-9]+$/.test(candidate)) return null;
  const hash = await sha256Hex(candidate);
  // Single roundtrip: key + project environment in one JOIN (was 2 sequential queries).
  const row = await db
    .select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      type: apiKeys.type,
      environment: apiKeys.environment,
      prefix: apiKeys.prefix,
      projectEnvironment: projects.environment,
    })
    .from(apiKeys)
    .innerJoin(projects, eq(projects.id, apiKeys.projectId))
    .where(eq(apiKeys.hashedKey, hash))
    .get();
  if (!row) return null;
  if (
    !row.projectEnvironment ||
    row.projectEnvironment !== row.environment ||
    row.prefix !== candidate.slice(0, candidate.indexOf('_'))
  )
    return null;
  // Touch lastUsedAt asynchronously (best-effort)
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .run()
    .catch(() => {});
  return {
    projectId: row.projectId,
    type: row.type,
    environment: row.environment,
  };
}

export async function listApiKeys(env: { DB: D1Database }, projectId: string) {
  const db = getDb(env);
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId))
    .all();
}

export async function getApiKeyById(env: { DB: D1Database }, keyId: string) {
  const db = getDb(env);
  return db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).get();
}

export async function revokeApiKey(env: { DB: D1Database }, keyId: string) {
  const db = getDb(env);
  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
}

export async function deleteProject(
  env: { DB: D1Database },
  projectId: string,
  developerId: string
) {
  const db = getDb(env);
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!project) throw new Error('Project not found');
  // Only owner or admin can delete — check member role
  const membership = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.developerId, developerId)
      )
    )
    .get();
  if (!membership) throw new Error('Forbidden');
  if (membership.role !== 'owner') {
    // Allow if developer is the original creator (developerId matches)
    if (project.developerId !== developerId)
      throw new Error('Only project owner can delete');
  }
  // Explicit child deletes first — immune to FK drift in long-lived D1
  // databases where older rows predate a cascade clause. Deleting users
  // cascades their sessions/oauth/recovery/profile/token rows.
  await db.delete(sessions).where(eq(sessions.projectId, projectId));
  await db.delete(users).where(eq(users.projectId, projectId));
  await db.delete(apiKeys).where(eq(apiKeys.projectId, projectId));
  await db
    .delete(projectDomains)
    .where(eq(projectDomains.projectId, projectId));
  await db
    .delete(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
  await db.delete(auditLogs).where(eq(auditLogs.projectId, projectId));
  await db
    .delete(webhookEndpoints)
    .where(eq(webhookEndpoints.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
  return { ok: true as const, projectId };
}
