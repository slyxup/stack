import { sql } from 'drizzle-orm';
import { randomToken, randomUUID, sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword } from '../lib/password';
import {
  apiKeys,
  developers,
  projectMembers,
  projects,
  sessions,
  users,
} from '../lib/schema';

/** Read env flag — supports both SINGLE_TENANT_MODE and ALLOW_PUBLIC_DEVELOPER_REGISTRATION */
export function isSingleTenant(
  env: Record<string, string | undefined>
): boolean {
  if (env.SINGLE_TENANT_MODE !== undefined)
    return env.SINGLE_TENANT_MODE === 'true';
  if (env.ALLOW_PUBLIC_DEVELOPER_REGISTRATION !== undefined)
    return env.ALLOW_PUBLIC_DEVELOPER_REGISTRATION !== 'true';
  // Default: single-tenant personal instance (safe)
  return true;
}

export function needsBootstrapSecret(
  env: Record<string, string | undefined>
): boolean {
  return !!env.BOOTSTRAP_SECRET;
}

export async function getBootstrapStatus(
  env: { DB: D1Database } & Record<string, string | undefined>
) {
  const db = getDb(env as { DB: D1Database });
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const configuredEmail =
    env.BOOTSTRAP_ADMIN_EMAIL ?? env.INITIAL_ADMIN_EMAIL ?? null;
  const hasSecret = !!env.BOOTSTRAP_SECRET;
  const singleTenant = isSingleTenant(env);
  return {
    needsBootstrap: count === 0,
    totalUsers: count,
    singleTenant,
    hasBootstrapSecret: hasSecret,
    bootstrapEmail: configuredEmail,
  };
}

/**
 * Bootstrap the very first admin.
 * - Only when users count == 0
 * - If BOOTSTRAP_SECRET env is set, requires matching token
 * - If BOOTSTRAP_ADMIN_EMAIL env is set, requires email to match
 * - Creates user (admin, verified, no mustChange), developer row, default project + initial keys
 */
export async function bootstrapAdmin(
  env: { DB: D1Database } & Record<string, string | undefined>,
  input: { email: string; password: string; token?: string; name?: string }
): Promise<{
  user: typeof users.$inferSelect;
  sessionToken: string;
  expiresAt: Date;
  project: typeof projects.$inferSelect | null;
  keys: { publishable: string; secret: string } | null;
}> {
  const db = getDb(env as { DB: D1Database });
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  if (count !== 0) throw new Error('ALREADY_BOOTSTRAPPED');

  const secret = env.BOOTSTRAP_SECRET ?? env.ADMIN_BOOTSTRAP_TOKEN;
  if (secret) {
    const provided = input.token ?? '';
    // timing safe compare via crypto? simple for now
    if (provided !== secret) throw new Error('INVALID_BOOTSTRAP_TOKEN');
  }
  const requiredEmail = env.BOOTSTRAP_ADMIN_EMAIL ?? env.INITIAL_ADMIN_EMAIL;
  if (
    requiredEmail &&
    input.email.toLowerCase() !== requiredEmail.toLowerCase()
  )
    throw new Error('EMAIL_NOT_ALLOWED_FOR_BOOTSTRAP');

  if (input.password.length < 8)
    throw new Error('Password must be at least 8 characters');

  const now = new Date();
  const userId = randomUUID();
  const passwordHash = await hashPassword(input.password);
  // Bootstrap admin is auto-verified — no email round-trip needed for platform owner
  // If password is still the well-known default, flag for change (defense in depth)
  const isDefaultPass =
    input.password === 'admin' ||
    input.password === 'changeme' ||
    input.password === 'password';
  await db.insert(users).values({
    id: userId,
    projectId: null,
    email: input.email.toLowerCase(),
    emailVerified: true,
    passwordHash,
    firstName: input.name ?? null,
    lastName: null,
    role: 'admin',
    blocked: false,
    mustChangePassword: isDefaultPass,
    createdAt: now,
    updatedAt: now,
  });

  // Ensure developer row
  const devId = randomUUID();
  await db.insert(developers).values({
    id: devId,
    userId,
    email: input.email.toLowerCase(),
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  // Create default project for platform usage (so stack app can get pk/sk immediately)
  let project: typeof projects.$inferSelect | null = null;
  let keys: { publishable: string; secret: string } | null = null;
  try {
    const projectId = randomUUID();
    const slug = 'slyxup-platform';
    const existingProject = await db
      .select()
      .from(projects)
      .where(sql`slug = ${slug}`)
      .get();
    if (!existingProject) {
      await db.insert(projects).values({
        id: projectId,
        developerId: devId,
        name: 'SlyxUp Platform',
        slug,
        description: 'Default project for self-host platform',
        environment: 'live',
        allowedDomains: [],
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(projectMembers).values({
        id: randomUUID(),
        projectId,
        developerId: devId,
        role: 'owner',
        createdAt: now,
      });
      const fetched = await db
        .select()
        .from(projects)
        .where(sql`id = ${projectId}`)
        .get();
      project = fetched ?? null;
      if (project) {
        // Create initial keys (pk_test + sk_test live)
        const pkSecret = randomToken(24);
        const pkFull = `pk_live_${pkSecret}`;
        const pkHash = await sha256Hex(pkFull);
        await db.insert(apiKeys).values({
          id: randomUUID(),
          projectId: project.id,
          name: 'platform-publishable',
          prefix: 'pk_live',
          hashedKey: pkHash,
          environment: 'live',
          type: 'publishable',
          createdAt: now,
          updatedAt: now,
        });
        const skSecret = randomToken(24);
        const skFull = `sk_live_${skSecret}`;
        const skHash = await sha256Hex(skFull);
        await db.insert(apiKeys).values({
          id: randomUUID(),
          projectId: project.id,
          name: 'platform-secret',
          prefix: 'sk_live',
          hashedKey: skHash,
          environment: 'live',
          type: 'secret',
          createdAt: now,
          updatedAt: now,
        });
        keys = { publishable: pkFull, secret: skFull };
      }
    } else {
      project = existingProject;
    }
  } catch (e) {
    console.error(
      JSON.stringify({ evt: 'bootstrap_project_failed', msg: String(e) })
    );
  }

  // Create session
  const sessionToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    projectId: null,
    token: sessionToken,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  const user = await db.select().from(users).where(sql`id = ${userId}`).get();
  if (!user) throw new Error('Bootstrap failed');
  return { user, sessionToken, expiresAt, project, keys };
}
