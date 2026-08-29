import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { auditLogs } from '../lib/schema';

type AuditAction = (typeof auditLogs.$inferInsert)['action'];

interface AuditContext {
  projectId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
export async function writeAuditLog(
  env: { DB: D1Database },
  action: AuditAction,
  ctx: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDb(env);
    await db.insert(auditLogs).values({
      projectId: ctx.projectId ?? null,
      userId: ctx.userId ?? null,
      action,
      metadata: metadata ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  } catch {
    // Audit writes are best-effort — never break the caller
  }
}

/**
 * Query audit logs for a project.
 */
export async function listAuditLogs(
  env: { DB: D1Database },
  opts: {
    projectId?: string;
    action?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }
) {
  const db = getDb(env);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = db.select().from(auditLogs).$dynamic();
  const conditions = [];
  if (opts.projectId) conditions.push(eq(auditLogs.projectId, opts.projectId));
  if (opts.userId) conditions.push(eq(auditLogs.userId, opts.userId));
  if (opts.action) {
    conditions.push(
      eq(
        auditLogs.action,
        opts.action as NonNullable<(typeof auditLogs.$inferInsert)['action']>
      )
    );
  }

  if (conditions.length > 0) {
    const { and } = await import('drizzle-orm');
    query = query.where(and(...conditions));
  }

  const { desc } = await import('drizzle-orm');
  const logs = await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  // Total count
  const { count } = await import('drizzle-orm');
  let countQuery = db.select({ total: count() }).from(auditLogs).$dynamic();
  if (conditions.length > 0) {
    const { and } = await import('drizzle-orm');
    countQuery = countQuery.where(and(...conditions));
  }
  const [{ total }] = await countQuery.all();

  return { logs, total, limit, offset };
}
