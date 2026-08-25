import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { users } from '../lib/schema';

export async function blockUser(
  env: { DB: D1Database },
  userId: string,
  reason?: string
) {
  const db = getDb(env);
  await db
    .update(users)
    .set({
      blocked: true,
      blockedReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  // Also revoke all active sessions for this user
  const { sessions } = await import('../lib/schema');
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function unblockUser(env: { DB: D1Database }, userId: string) {
  const db = getDb(env);
  await db
    .update(users)
    .set({ blocked: false, blockedReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function setUserRole(
  env: { DB: D1Database },
  userId: string,
  role: 'user' | 'admin'
) {
  const db = getDb(env);
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
