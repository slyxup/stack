import { and, eq } from 'drizzle-orm';
import { randomToken, randomUUID, timingSafeEqual } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword } from '../lib/password';
import { passwordResetTokens, users, verificationTokens } from '../lib/schema';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h for verify
const RESET_TTL_MS = 1000 * 60 * 60; // 1h for reset

export async function createVerificationToken(
  env: { DB: D1Database },
  userId: string | null,
  email: string
) {
  const db = getDb(env);
  const token = randomToken(32);
  await db.insert(verificationTokens).values({
    id: randomUUID(),
    userId,
    email,
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    createdAt: new Date(),
  });
  return token;
}

export async function verifyEmail(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  const row = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .get();
  if (!row) throw new Error('Invalid token');
  if (row.expiresAt < new Date()) throw new Error('Token expired');
  if (row.userId) {
    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, row.userId));
  }
  await db.delete(verificationTokens).where(eq(verificationTokens.id, row.id));
  return { email: row.email };
}

export async function resendVerification(
  env: { DB: D1Database },
  email: string
) {
  const db = getDb(env);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();
  // Do not reveal existence — always succeed silently
  if (!user) return null;
  return createVerificationToken(env, user.id, user.email);
}

export async function forgotPassword(env: { DB: D1Database }, email: string) {
  const db = getDb(env);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (!user) return null; // silent
  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({
    id: randomUUID(),
    userId: user.id,
    email,
    token,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
    used: false,
    createdAt: new Date(),
  });
  return token;
}

export async function resetPassword(
  env: { DB: D1Database },
  token: string,
  newPassword: string
) {
  const db = getDb(env);
  const row = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .get();
  if (!row || row.used) throw new Error('Invalid or used token');
  if (row.expiresAt < new Date()) throw new Error('Token expired');
  if (!row.userId) throw new Error('Invalid token');
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, row.id));
  return { email: row.email };
}

// ── Token validation helper (used by routes) ──
export async function validateToken(
  env: { DB: D1Database },
  table: 'verification' | 'password_reset',
  token: string
) {
  const db = getDb(env);
  if (table === 'verification') {
    const row = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .get();
    return row && !timingSafeEqual('', '') ? row : row;
  }
  const row = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, token)))
    .get();
  return row;
}
