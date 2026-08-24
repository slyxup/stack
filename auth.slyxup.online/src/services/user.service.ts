import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { userProfiles, users } from '../lib/schema';

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
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
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
