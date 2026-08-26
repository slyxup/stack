import { eq, sql } from 'drizzle-orm';
import { randomToken, randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { sessions, users, verificationTokens } from '../lib/schema';
import { sendVerificationEmail } from './token.service';

export async function signUp(
  env: { DB: D1Database },
  input: {
    email: string;
    password: string;
    projectId?: string;
    firstName?: string;
    lastName?: string;
  }
) {
  const db = getDb(env);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .get();
  if (existing) throw new Error('Email already exists');

  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();
  const now = new Date();

  // Bootstrap: the very first user becomes the platform admin
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const role = count === 0 ? 'admin' : 'user';

  await db.insert(users).values({
    id: userId,
    projectId: input.projectId ?? null,
    email: input.email,
    emailVerified: false,
    passwordHash,
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
  input: { email: string; password: string; projectId?: string }
) {
  const db = getDb(env);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .get();
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');
  if (user.blocked)
    throw new Error(
      `ACCOUNT_BLOCKED:${user.blockedReason ?? 'Contact support'}`
    );
  if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');

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

  return { user, sessionToken, expiresAt };
}

export async function getSession(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  if (!user) return null;
  return { session, user };
}

export async function signOut(env: { DB: D1Database }, token: string) {
  const db = getDb(env);
  await db.delete(sessions).where(eq(sessions.token, token));
}
