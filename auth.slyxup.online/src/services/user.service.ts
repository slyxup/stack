import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  auditLogs,
  oauthAccounts,
  passwordResetTokens,
  sessions,
  userProfiles,
  users,
  verificationTokens,
} from '../lib/schema';

export async function updateUser(
  env: { DB: D1Database },
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    preferences?: Record<string, unknown>;
  }
) {
  const db = getDb(env);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.lastName !== undefined) patch.lastName = input.lastName;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl || null;
  if (input.preferences !== undefined) patch.preferences = input.preferences;
  await db.update(users).set(patch).where(eq(users.id, userId));
  return db.select().from(users).where(eq(users.id, userId)).get();
}

export async function deleteUser(env: { DB: D1Database }, userId: string) {
  const db = getDb(env);
  // Explicit deletes for D1 safety — even though FK cascades should handle
  // sessions/oauth/tokens, we delete explicitly so no orphans survive if
  // pragma foreign_keys is off or migration is mid-flight.
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, userId));
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.userId, userId));
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  // Keep audit logs (userId -> SET NULL) for compliance, then remove user
  await db.delete(users).where(eq(users.id, userId));
}

export async function ensureProfile(env: { DB: D1Database }, userId: string) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .get();
  if (existing) return existing;
  const profile = {
    id: crypto.randomUUID(),
    userId,
    bio: null,
    phone: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.insert(userProfiles).values(profile);
  return profile;
}

/** Change password: verify current, then rehash. Throws on bad current password. */
export async function changePassword(
  env: { DB: D1Database },
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const db = getDb(env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error('User not found');
  // OAuth-only accounts have no password to replace
  if (!user.passwordHash) throw new Error('No password set for this account');
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new Error('Current password is incorrect');
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { ok: true };
}

export interface SessionListItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/** List all sessions for a user; marks which one the current request belongs to. */
export async function listSessions(
  env: { DB: D1Database },
  userId: string,
  currentToken: string
): Promise<SessionListItem[]> {
  const db = getDb(env);
  const rows = await db
    .select({
      id: sessions.id,
      token: sessions.token,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.updatedAt))
    .all();
  return rows.map(({ token, ...rest }) => ({
    ...rest,
    isCurrent: token === currentToken,
  }));
}

/** Revoke one session — ownership enforced via userId match. */
export async function revokeSession(
  env: { DB: D1Database },
  userId: string,
  sessionId: string
) {
  const db = getDb(env);
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  return { ok: true };
}

/** Revoke every session except the caller's current one. Returns count. */
export async function revokeOtherSessions(
  env: { DB: D1Database },
  userId: string,
  currentToken: string
) {
  const db = getDb(env);
  const result = await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.token, currentToken),
        gt(sessions.expiresAt, new Date())
      )
    )
    .run();
  return { ok: true, revoked: result.meta.changes ?? 0 };
}
