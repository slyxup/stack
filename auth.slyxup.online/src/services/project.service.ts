import { and, eq, inArray } from 'drizzle-orm';
import { randomToken, randomUUID, sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { apiKeys, developers, projectMembers, projects } from '../lib/schema';

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
    environment: 'test' | 'live';
  }
) {
  const db = getDb(env);
  const prefix = `${input.type === 'publishable' ? 'pk' : 'sk'}_${input.environment}`;
  const { full, raw } = generateKey(prefix);
  const hashedKey = await sha256Hex(raw);
  const now = new Date();
  const key = {
    id: randomUUID(),
    projectId: input.projectId,
    name: input.name,
    prefix,
    hashedKey,
    environment: input.environment,
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
  const hash = await sha256Hex(rawKey.trim());
  const row = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hash))
    .get();
  if (!row) return null;
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
