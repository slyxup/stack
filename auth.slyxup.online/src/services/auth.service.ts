import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomToken, randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  recoveryCodes,
  sessions,
  users,
  verificationTokens,
} from '../lib/schema';
import { verifyTOTP } from '../lib/totp';
import { sendVerificationEmail } from './token.service';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

export async function signUp(
  env: { DB: D1Database },
  input: {
    email: string;
    password: string;
    projectId?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }
) {
  const db = getDb(env);
  // Project-scoped uniqueness: same email can exist in different projects.
  const existing = input.projectId
    ? await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, input.email),
            eq(users.projectId, input.projectId)
          )
        )
        .get()
    : await db
        .select()
        .from(users)
        .where(and(eq(users.email, input.email), isNull(users.projectId)))
        .get();
  if (existing) throw new Error('Email already exists');

  // Username uniqueness (when provided).
  if (input.username) {
    const nameTaken = await findByUsername(
      db,
      input.username,
      input.projectId ?? null
    );
    if (nameTaken) throw new Error('Username already taken');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();
  const now = new Date();

  // Bootstrap: the very first user becomes the platform admin
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const role = count === 0 ? 'admin' : 'user';

  // Security: after bootstrap, require a publishable key (projectId) for sign-ups.
  if (!input.projectId && count > 0) {
    throw new Error(
      'Publishable key required. Provide X-Publishable-Key header for sign-up.'
    );
  }

  await db.insert(users).values({
    id: userId,
    projectId: input.projectId ?? null,
    email: input.email,
    emailVerified: false,
    passwordHash,
    username: input.username ?? null,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    role,
    createdAt: now,
    updatedAt: now,
  });

  // Create verification token
  const token = randomToken(32);
  await db.insert(verificationTokens).values({
    id: randomUUID(),
    userId,
    email: input.email,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: now,
  });

  // Create session
  const sessionToken = randomToken(32);
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    projectId: input.projectId ?? null,
    token: sessionToken,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  // Deliver the verification email (best-effort, never blocks signup)
  await sendVerificationEmail(
    env as unknown as Record<string, string | undefined>,
    input.email,
    token
  );

  return {
    userId,
    sessionToken,
    expiresAt,
    verificationToken: token,
    role,
    user: { id: userId, email: input.email },
  };
}

export async function signIn(
  env: { DB: D1Database },
  input: {
    email?: string;
    username?: string;
    password: string;
    projectId?: string;
  }
) {
  const db = getDb(env);
  let user: typeof users.$inferSelect | undefined;
  if (input.username) {
    // Username login — resolve within project scope (or platform when no projectId).
    user = await findByUsername(db, input.username, input.projectId ?? null);
  } else if (input.projectId) {
    // Try project-scoped user first
    const email = input.email as string;
    user = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.projectId, input.projectId)))
      .get();
    // Fallback: platform user (project_id null) who is a member of this project
    // This allows dashboard/platform users to sign in via the platform's publishable key
    if (!user) {
      const platformUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.projectId)))
        .get();
      if (platformUser) {
        // Check if this platform user's developer is a member of the project
        const { developers, projectMembers } = await import('../lib/schema');
        const dev = await db
          .select()
          .from(developers)
          .where(eq(developers.userId, platformUser.id))
          .get();
        if (dev) {
          const membership = await db
            .select()
            .from(projectMembers)
            .where(
              and(
                eq(projectMembers.projectId, input.projectId),
                eq(projectMembers.developerId, dev.id)
              )
            )
            .get();
          if (membership) user = platformUser;
        }
        // Also allow if no developer link but it's the platform owner (first admin)
        // For bootstrap, allow any platform admin to sign in via any project key they own
        if (!user && platformUser.role === 'admin') {
          user = platformUser;
        }
      }
    }
  } else {
    // Platform user only — never fall back to an arbitrary project user
    const email = input.email as string;
    user = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.projectId)))
      .get();
  }
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  if (user.blocked)
    throw new Error(
      `ACCOUNT_BLOCKED:${user.blockedReason ?? 'Contact support'}`
    );
  if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');

  if (user.twoFactorEnabled) {
    // Password is verified but 2FA is required. Do NOT create a usable session.
    // Store a short-lived pending challenge so the client can complete login
    // with a TOTP code or recovery code in a second step.
    const challengeToken = randomToken(32);
    await (env as unknown as { KV?: KVNamespace }).KV?.put(
      `2fa_challenge:${challengeToken}`,
      JSON.stringify({
        userId: user.id,
        projectId: user.projectId,
        scope: input.projectId ?? user.projectId ?? null,
      }),
      { expirationTtl: 5 * 60 }
    );
    return { user, challengeToken, requires2FA: true };
  }

  const sessionToken = randomToken(32);
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const now = new Date();
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    projectId: input.projectId ?? user.projectId ?? null,
    token: sessionToken,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return { user, sessionToken, expiresAt, requires2FA: false };
}

/**
 * Complete sign-in when 2FA is enabled: verify a TOTP code or single-use recovery
 * code against the pending challenge, then create a real session.
 */
export async function complete2FASignIn(
  env: { DB: D1Database; KV?: KVNamespace },
  challengeToken: string,
  code?: string,
  recoveryCode?: string
) {
  const raw = await env.KV?.get(`2fa_challenge:${challengeToken}`);
  if (!raw) throw new Error('2FA_CHALLENGE_INVALID');
  const challenge = JSON.parse(raw) as {
    userId: string;
    projectId: string | null;
    scope: string | null;
  };
  const db = getDb(env);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, challenge.userId))
    .get();
  if (!user || !user.twoFactorEnabled || !user.totpSecret) {
    await env.KV?.delete(`2fa_challenge:${challengeToken}`);
    throw new Error('2FA_NOT_ENABLED');
  }

  let ok = false;
  if (!ok && code) {
    ok = await verifyTOTP(user.totpSecret, code);
  }
  if (!ok && recoveryCode) {
    ok = await redeemRecoveryCode(db, user.id, recoveryCode);
  }
  if (!ok) throw new Error('INVALID_2FA_CODE');

  await env.KV?.delete(`2fa_challenge:${challengeToken}`);

  const sessionToken = randomToken(32);
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const now = new Date();
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    projectId: challenge.scope ?? challenge.projectId ?? null,
    token: sessionToken,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return { user, sessionToken, expiresAt };
}

/** Find a user by username within a project scope (projectId null = platform users). */
async function findByUsername(
  db: ReturnType<typeof getDb>,
  username: string,
  projectId: string | null
): Promise<typeof users.$inferSelect | undefined> {
  if (projectId) {
    const scoped = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.projectId, projectId)))
      .get();
    if (scoped) return scoped;
    // Fall back to platform user (project_id null) with this username.
    return db
      .select()
      .from(users)
      .where(and(eq(users.username, username), isNull(users.projectId)))
      .get();
  }
  return db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.projectId)))
    .get();
}

/** Redeem a single-use recovery code. Returns true if a valid, unused code matched. */
async function redeemRecoveryCode(
  db: ReturnType<typeof getDb>,
  userId: string,
  code: string
): Promise<boolean> {
  const codeHash = await sha256Hex(code);
  const row = await db
    .select()
    .from(recoveryCodes)
    .where(
      and(
        eq(recoveryCodes.userId, userId),
        eq(recoveryCodes.codeHash, codeHash),
        eq(recoveryCodes.used, false)
      )
    )
    .get();
  if (!row) return false;
  await db
    .update(recoveryCodes)
    .set({ used: true, usedAt: new Date() })
    .where(eq(recoveryCodes.id, row.id));
  return true;
}

export async function getSession(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Cleanup expired session
    await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .catch(() => undefined);
    return null;
  }
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  if (!user) {
    // User deleted — cleanup orphaned session
    await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .catch(() => undefined);
    return null;
  }
  if (!user.emailVerified) return null;
  if (user.blocked) {
    // Blocked user — revoke session immediately
    await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .catch(() => undefined);
    return null;
  }
  if (user.deletedAt) {
    await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .catch(() => undefined);
    return null;
  }
  return { session, user };
}

export async function signOut(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  await db.delete(sessions).where(eq(sessions.token, token));
}
