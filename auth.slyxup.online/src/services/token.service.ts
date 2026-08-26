import { and, eq } from 'drizzle-orm';
import { randomToken, randomUUID, timingSafeEqual } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword } from '../lib/password';
import { passwordResetTokens, users, verificationTokens } from '../lib/schema';
import {
  resetPasswordEmailHtml,
  trySend,
  verificationEmailHtml,
} from './email.service';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h for verify
const RESET_TTL_MS = 1000 * 60 * 60; // 1h for reset

type Env = Record<string, string | undefined>;

function authBase(env: Env): string {
  return (env.HOSTED_AUTH_URL ?? env.APP_URL ?? '').replace(/\/$/, '');
}

/** Send the verify-email email (confirm page is hosted on this worker). */
export async function sendVerificationEmail(
  env: Env,
  email: string,
  token: string
) {
  const base = authBase(env);
  if (!base) return;
  const link = `${base}/v1/verification/confirm?token=${token}`;
  await trySend(env, {
    to: email,
    subject: 'Verify your email — SlyxUp',
    html: verificationEmailHtml(link),
    text: `Verify your SlyxUp account: ${link} (expires in 24h)`,
  });
}

/** Send the password-reset email (form hosted on this worker). */
export async function sendResetEmail(env: Env, email: string, token: string) {
  const base = authBase(env);
  if (!base) return;
  const link = `${base}/v1/verification/reset?token=${token}`;
  await trySend(env, {
    to: email,
    subject: 'Reset your password — SlyxUp',
    html: resetPasswordEmailHtml(link),
    text: `Reset your SlyxUp password: ${link} (expires in 1 hour)`,
  });
}

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
  const token = await createVerificationToken(env, user.id, user.email);
  await sendVerificationEmail(env as unknown as Env, user.email, token);
  return token;
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
  await sendResetEmail(env as unknown as Env, email, token);
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
