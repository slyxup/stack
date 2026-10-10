import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomToken, randomUUID, sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { type RequestMeta, generateFingerprint } from '../lib/fingerprint';
import { log } from '../lib/logger';
import {
  CURRENT_HASH_VERSION,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../lib/password';
import {
  recoveryCodes,
  sessions,
  userProfiles,
  users,
  verificationTokens,
} from '../lib/schema';
import { verifyTOTP } from '../lib/totp';
import { sendVerificationEmail } from './token.service';

/** Access tokens live 24h; refresh tokens live 7d and rotate them. */
export const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
export const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
/** Sliding window: active sessions extend their access token when <12h remain. */
export const SESSION_SLIDE_WINDOW_MS = 1000 * 60 * 60 * 12;

/** Mint a fresh access + refresh token pair with their expiries. */
export function mintSessionTokens(now = Date.now()) {
  return {
    sessionToken: randomToken(32),
    refreshToken: randomToken(32),
    expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  };
}

export async function signUp(
  env: { DB: D1Database } & Record<string, string | undefined>,
  input: {
    email: string;
    password: string;
    projectId?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    bootstrapToken?: string;
  },
  meta?: RequestMeta
) {
  const db = getDb(env);
  const email = input.email.trim().toLowerCase();
  // Project-scoped uniqueness: same email can exist in different projects.
  const existing = input.projectId
    ? await db
        .select()
        .from(users)
        .where(
          and(
            sql`lower(${users.email}) = ${email}`,
            eq(users.projectId, input.projectId)
          )
        )
        .get()
    : await db
        .select()
        .from(users)
        .where(
          and(sql`lower(${users.email}) = ${email}`, isNull(users.projectId))
        )
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

  // Single-tenant: first admin claim can be locked via env
  if (count === 0 && !input.projectId) {
    const requiredEmail = (
      env.BOOTSTRAP_ADMIN_EMAIL ?? env.INITIAL_ADMIN_EMAIL
    )?.toLowerCase();
    if (requiredEmail && email !== requiredEmail) {
      throw new Error('EMAIL_NOT_ALLOWED_FOR_BOOTSTRAP');
    }
    const secret = env.BOOTSTRAP_SECRET ?? env.ADMIN_BOOTSTRAP_TOKEN;
    if (secret) {
      const token = input.bootstrapToken ?? '';
      if (token !== secret) throw new Error('INVALID_BOOTSTRAP_TOKEN');
    }
  }

  // Security: after bootstrap, require a publishable key (projectId) for sign-ups.
  if (!input.projectId && count > 0) {
    throw new Error(
      'Publishable key required. Provide X-Publishable-Key header for sign-up.'
    );
  }

  // Default bootstrap passwords are flagged for rotation
  const isDefaultPass =
    input.password === 'admin' ||
    input.password === 'changeme' ||
    input.password === 'password';
  await db.insert(users).values({
    id: userId,
    projectId: input.projectId ?? null,
    email,
    emailVerified: false,
    passwordHash,
    passwordHashVersion: CURRENT_HASH_VERSION,
    username: input.username ?? null,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    role,
    mustChangePassword: role === 'admin' && isDefaultPass,
    createdAt: now,
    updatedAt: now,
  });

  // Create verification token
  const token = randomToken(32);
  await db.insert(verificationTokens).values({
    id: randomUUID(),
    userId,
    email,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: now,
  });

  // Create session (fingerprinted to IP + UA when a secret is configured).
  // Access token 24h + refresh token 7d (auto-rotated, never logs active users out).
  const minted = mintSessionTokens();
  const sessionToken = minted.sessionToken;
  const expiresAt = minted.expiresAt;
  const sessionId = randomUUID();
  const fingerprint = meta
    ? await generateFingerprint(meta, env.SESSION_SECRET)
    : null;
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    projectId: input.projectId ?? null,
    token: sessionToken,
    refreshToken: minted.refreshToken,
    refreshExpiresAt: minted.refreshExpiresAt,
    ipAddress: meta?.ip ?? null,
    userAgent: meta?.userAgent ?? null,
    fingerprintHash: fingerprint,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  // Deliver the verification email (best-effort, never blocks signup)
  await sendVerificationEmail(
    env as unknown as Record<string, string | undefined>,
    email,
    token
  );

  return {
    userId,
    sessionToken,
    refreshToken: minted.refreshToken,
    expiresAt,
    refreshExpiresAt: minted.refreshExpiresAt,
    verificationToken: token,
    role,
    user: { id: userId, email },
  };
}

export type SignInResult =
  | {
      user: typeof users.$inferSelect;
      sessionToken: string;
      refreshToken: string;
      expiresAt: Date;
      refreshExpiresAt: Date;
      requires2FA: false;
    }
  | {
      user: typeof users.$inferSelect;
      challengeToken: string;
      requires2FA: true;
    };

export async function signIn(
  env: { DB: D1Database; SESSION_SECRET?: string },
  input: {
    email?: string;
    username?: string;
    password: string;
    projectId?: string;
  },
  meta?: RequestMeta
): Promise<SignInResult> {
  const db = getDb(env);
  const email = input.email?.trim().toLowerCase();
  let user: typeof users.$inferSelect | undefined;
  if (input.username) {
    // Username login — resolve within project scope (or platform when no projectId).
    user = await findByUsername(db, input.username, input.projectId ?? null);
  } else if (input.projectId) {
    // Try project-scoped user first
    user = await db
      .select()
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          eq(users.projectId, input.projectId)
        )
      )
      .get();
    // Fallback: platform user (project_id null) who is a member of this project
    // This allows dashboard/platform users to sign in via the platform's publishable key
    if (!user) {
      const platformUser = await db
        .select()
        .from(users)
        .where(
          and(sql`lower(${users.email}) = ${email}`, isNull(users.projectId))
        )
        .get();
      if (platformUser) {
        // Check if this platform user's developer is a member of the project —
        // one JOIN query instead of two sequential lookups.
        const { developers, projectMembers } = await import('../lib/schema');
        const link = await db
          .select({ developerId: developers.id })
          .from(developers)
          .innerJoin(
            projectMembers,
            and(
              eq(projectMembers.developerId, developers.id),
              eq(projectMembers.projectId, input.projectId)
            )
          )
          .where(eq(developers.userId, platformUser.id))
          .get();
        if (link) user = platformUser;
        // Also allow if no developer link but it's the platform owner (first admin)
        // For bootstrap, allow any platform admin to sign in via any project key they own
        if (!user && platformUser.role === 'admin') {
          user = platformUser;
        }
      }
    }
  } else {
    // Platform user only — never fall back to an arbitrary project user
    user = await db
      .select()
      .from(users)
      .where(
        and(sql`lower(${users.email}) = ${email}`, isNull(users.projectId))
      )
      .get();
  }
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  // Opportunistic rehash: upgrade legacy/unversioned hashes → PBKDF2-100k on login.
  // Best-effort — never blocks authentication.
  if (needsRehash(user.passwordHash)) {
    try {
      const newHash = await hashPassword(input.password);
      await db
        .update(users)
        .set({
          passwordHash: newHash,
          passwordHashVersion: CURRENT_HASH_VERSION,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    } catch {
      log.warn('password_rehash_failed', { userId: user.id });
    }
  }
  if (user.blocked)
    throw new Error(
      `ACCOUNT_BLOCKED:${user.blockedReason ?? 'Contact support'}`
    );
  if (user.mustChangePassword) throw new Error('PASSWORD_CHANGE_REQUIRED');
  if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');

  if (user.twoFactorEnabled) {
    // Password is verified but 2FA is required. Do NOT create a usable session.
    // Store a short-lived pending challenge so the client can complete login
    // with a TOTP code or recovery code in a second step.
    const { issueChallenge } = await import('./challenge.service');
    const challengeToken = await issueChallenge(
      env,
      'two_factor',
      {
        userId: user.id,
        projectId: user.projectId,
        scope: input.projectId ?? user.projectId ?? null,
      },
      5 * 60
    );
    return { user, challengeToken, requires2FA: true };
  }

  const minted = mintSessionTokens();
  const sessionToken = minted.sessionToken;
  const expiresAt = minted.expiresAt;
  const sessionId = randomUUID();
  const now = new Date();
  const fingerprint = meta
    ? await generateFingerprint(meta, env.SESSION_SECRET)
    : null;
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    projectId: input.projectId ?? user.projectId ?? null,
    token: sessionToken,
    refreshToken: minted.refreshToken,
    refreshExpiresAt: minted.refreshExpiresAt,
    ipAddress: meta?.ip ?? null,
    userAgent: meta?.userAgent ?? null,
    fingerprintHash: fingerprint,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    user,
    sessionToken,
    refreshToken: minted.refreshToken,
    expiresAt,
    refreshExpiresAt: minted.refreshExpiresAt,
    requires2FA: false,
  };
}

/**
 * Complete sign-in when 2FA is enabled: verify a TOTP code or single-use recovery
 * code against the pending challenge, then create a real session.
 */
export async function complete2FASignIn(
  env: { DB: D1Database; KV?: KVNamespace; SESSION_SECRET?: string },
  challengeToken: string,
  code?: string,
  recoveryCode?: string,
  meta?: RequestMeta
) {
  const { readChallenge, consumeChallenge } = await import(
    './challenge.service'
  );
  const pending = await readChallenge(env, 'two_factor', challengeToken);
  if (!pending) throw new Error('2FA_CHALLENGE_INVALID');
  const challenge = pending.payload as {
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
  if (
    !user ||
    user.blocked ||
    !user.emailVerified ||
    user.mustChangePassword ||
    !user.twoFactorEnabled ||
    !user.totpSecret
  ) {
    await consumeChallenge(env, 'two_factor', challengeToken);
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

  if (!(await consumeChallenge(env, 'two_factor', challengeToken)))
    throw new Error('2FA_CHALLENGE_INVALID');

  const minted = mintSessionTokens();
  const sessionToken = minted.sessionToken;
  const expiresAt = minted.expiresAt;
  const sessionId = randomUUID();
  const now = new Date();
  const fingerprint = meta
    ? await generateFingerprint(meta, env.SESSION_SECRET)
    : null;
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    projectId: challenge.scope ?? challenge.projectId ?? null,
    token: sessionToken,
    refreshToken: minted.refreshToken,
    refreshExpiresAt: minted.refreshExpiresAt,
    ipAddress: meta?.ip ?? null,
    userAgent: meta?.userAgent ?? null,
    fingerprintHash: fingerprint,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    user,
    sessionToken,
    refreshToken: minted.refreshToken,
    expiresAt,
    refreshExpiresAt: minted.refreshExpiresAt,
  };
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
  const claimed = await db
    .update(recoveryCodes)
    .set({ used: true, usedAt: new Date() })
    .where(and(eq(recoveryCodes.id, row.id), eq(recoveryCodes.used, false)))
    .returning({ id: recoveryCodes.id });
  return claimed.length === 1;
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>['user'];

export async function getSession(
  env: { DB: D1Database; SESSION_SECRET?: string },
  token: string,
  meta?: RequestMeta
) {
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
  // Fingerprint check: sessions are bound to IP + UA. Mobile/corporate
  // networks rotate IPs mid-use, so an IP-only change on the same device
  // (same normalized UA) always rotates instead of revoking. A mismatch on
  // BOTH IP and device older than the rotation grace (5 min) means likely
  // hijack → revoke. Within grace, rotate the fingerprint instead.
  if (meta && session.fingerprintHash && env.SESSION_SECRET) {
    const current = await generateFingerprint(meta, env.SESSION_SECRET);
    if (current && current !== session.fingerprintHash) {
      const { normalizeUserAgent } = await import('../lib/fingerprint');
      const uaSame =
        !!meta.userAgent &&
        !!session.userAgent &&
        normalizeUserAgent(meta.userAgent) ===
          normalizeUserAgent(session.userAgent);
      const ageMs = Date.now() - new Date(session.updatedAt).getTime();
      if (!uaSame && ageMs > 5 * 60 * 1000) {
        log.warn('session_fingerprint_mismatch', { sessionId: session.id });
        await db
          .delete(sessions)
          .where(eq(sessions.token, token))
          .catch(() => undefined);
        return null;
      }
      await db
        .update(sessions)
        .set({
          fingerprintHash: current,
          ipAddress: meta.ip ?? session.ipAddress,
          userAgent: meta.userAgent ?? session.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, session.id))
        .catch(() => undefined);
    }
  }
  // Rolling upkeep (best-effort, never blocks the request):
  // 1. Legacy rows without a refresh token get one (upgrade without logout).
  // 2. Active sessions within the slide window extend their 24h access token
  //    (capped by the 7d refresh expiry) so use never interrupts.
  {
    const nowMs = Date.now();
    const accessLeftMs = new Date(session.expiresAt).getTime() - nowMs;
    const refreshValid =
      session.refreshExpiresAt &&
      new Date(session.refreshExpiresAt).getTime() > nowMs;
    const needsRefreshToken = !session.refreshToken || !refreshValid;
    const needsSlide =
      accessLeftMs < SESSION_SLIDE_WINDOW_MS &&
      (refreshValid || needsRefreshToken);
    if (needsRefreshToken || needsSlide) {
      const minted = mintSessionTokens(nowMs);
      const cappedAccess =
        refreshValid && session.refreshExpiresAt
          ? new Date(
              Math.min(
                minted.expiresAt.getTime(),
                new Date(session.refreshExpiresAt).getTime()
              )
            )
          : minted.expiresAt;
      await db
        .update(sessions)
        .set({
          ...(needsRefreshToken
            ? {
                refreshToken: minted.refreshToken,
                refreshExpiresAt: minted.refreshExpiresAt,
              }
            : {}),
          expiresAt: needsSlide ? cappedAccess : session.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, session.id))
        .catch(() => undefined);
      if (needsSlide) session.expiresAt = cappedAccess;
    }
  }
  // User + profile are independent once the session is known — fetch concurrently.
  const [user, profile] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).get(),
    db
      .select({ bio: userProfiles.bio })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.userId))
      .get(),
  ]);
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
  return { session, user: { ...user, bio: profile?.bio ?? null } };
}

/**
 * Rotate an access token with a valid refresh token (7d window).
 * Returns the new pair, or null when the refresh token is unknown/expired.
 * Rotation is atomic-ish: the row is only updated when the presented refresh
 * token still matches (guards against concurrent double-refresh races).
 */
export async function refreshSession(
  env: { DB: D1Database; SESSION_SECRET?: string },
  refreshToken: string,
  meta?: RequestMeta
) {
  if (!refreshToken) return null;
  const db = getDb(env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .get();
  if (!session || !session.refreshExpiresAt) return null;
  if (new Date(session.refreshExpiresAt).getTime() <= Date.now()) {
    await db
      .delete(sessions)
      .where(eq(sessions.id, session.id))
      .catch(() => undefined);
    return null;
  }
  const [user] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).get(),
  ]);
  if (
    !user ||
    user.blocked ||
    user.deletedAt ||
    !user.emailVerified ||
    user.mustChangePassword
  ) {
    if (user?.blocked) {
      await db
        .delete(sessions)
        .where(eq(sessions.id, session.id))
        .catch(() => undefined);
    }
    return null;
  }
  const minted = mintSessionTokens();
  const fingerprint = meta
    ? await generateFingerprint(meta, env.SESSION_SECRET)
    : session.fingerprintHash;
  const rotated = await db
    .update(sessions)
    .set({
      token: minted.sessionToken,
      refreshToken: minted.refreshToken,
      expiresAt: minted.expiresAt,
      refreshExpiresAt: minted.refreshExpiresAt,
      fingerprintHash: fingerprint,
      ipAddress: meta?.ip ?? session.ipAddress,
      userAgent: meta?.userAgent ?? session.userAgent,
      updatedAt: new Date(),
    })
    .where(
      and(eq(sessions.id, session.id), eq(sessions.refreshToken, refreshToken))
    )
    .returning({ id: sessions.id });
  if (rotated.length !== 1) return null;
  return {
    user,
    sessionToken: minted.sessionToken,
    refreshToken: minted.refreshToken,
    expiresAt: minted.expiresAt,
    refreshExpiresAt: minted.refreshExpiresAt,
  };
}

export async function forcePasswordChange(
  env: { DB: D1Database },
  input: {
    email: string;
    oldPassword: string;
    newPassword: string;
    projectId?: string | null;
  }
) {
  const db = getDb(env);
  const email = input.email.trim().toLowerCase();
  let user: typeof users.$inferSelect | undefined;
  if (input.projectId) {
    user = await db
      .select()
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          eq(users.projectId, input.projectId)
        )
      )
      .get();
    if (!user) {
      user = await db
        .select()
        .from(users)
        .where(
          and(sql`lower(${users.email}) = ${email}`, isNull(users.projectId))
        )
        .get();
    }
  } else {
    user = await db
      .select()
      .from(users)
      .where(
        and(sql`lower(${users.email}) = ${email}`, isNull(users.projectId))
      )
      .get();
  }
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(input.oldPassword, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  if (!user.mustChangePassword) throw new Error('PASSWORD_CHANGE_NOT_REQUIRED');
  if (input.newPassword.length < 8)
    throw new Error('Password must be at least 8 characters');
  if (input.newPassword === input.oldPassword)
    throw new Error('New password must differ');
  const newHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordHashVersion: CURRENT_HASH_VERSION,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  // Revoke all sessions after forced change
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  return { ok: true as const };
}

export async function signOut(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** Revoke a session by its refresh token (used when the access token expired). */
export async function signOutByRefresh(
  env: { DB: D1Database },
  refreshToken: string
) {
  if (!refreshToken) return;
  const db = getDb(env);
  await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
}
