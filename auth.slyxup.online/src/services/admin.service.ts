import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { sessions, users } from '../lib/schema';
import { writeAuditLog } from './audit.service';

export async function blockUser(
  env: { DB: D1Database },
  userId: string,
  reason?: string,
  auditCtx?: {
    projectId?: string | null;
    adminUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
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
  await db.delete(sessions).where(eq(sessions.userId, userId));
  // Audit log
  if (auditCtx) {
    void writeAuditLog(
      env,
      'user.blocked',
      {
        projectId: auditCtx.projectId ?? null,
        userId: auditCtx.adminUserId ?? null,
        ipAddress: auditCtx.ipAddress ?? null,
        userAgent: auditCtx.userAgent ?? null,
      },
      { targetUserId: userId, reason: reason ?? null }
    );
  }
}

export async function unblockUser(
  env: { DB: D1Database },
  userId: string,
  auditCtx?: {
    projectId?: string | null;
    adminUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const db = getDb(env);
  await db
    .update(users)
    .set({ blocked: false, blockedReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  // Audit log
  if (auditCtx) {
    void writeAuditLog(
      env,
      'user.unblocked',
      {
        projectId: auditCtx.projectId ?? null,
        userId: auditCtx.adminUserId ?? null,
        ipAddress: auditCtx.ipAddress ?? null,
        userAgent: auditCtx.userAgent ?? null,
      },
      { targetUserId: userId }
    );
  }
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
