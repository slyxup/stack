import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getDb } from '../lib/db';
import { checkRateLimit } from '../lib/rate-limit';
import { invoices, refundRequests, subscriptions } from '../lib/schema';
import { isoOrNull } from '../lib/serialize';
import type { Env } from '../middleware/auth';
import { requireAdmin, requireUser } from '../middleware/auth';
import { refundDecisionSchema, refundRequestSchema } from '../schemas/billing';
import {
  getPaddleConfig,
  resolveProjectEnvironment,
} from '../services/paddle-config';

// ── Refund policy (single source of truth, mirrored in SOffice /refund page) ──
export const REFUND_WINDOW_DAYS = 7;
export const REFUND_MAX_REQUESTS_PER_90D = 2;
export const REFUND_REASON_MIN = 10;
export const REFUND_REASON_MAX = 1000;

type Bindings = Env['Bindings'];
type Variables = Env['Variables'];

function serialize(r: typeof refundRequests.$inferSelect) {
  return {
    id: r.id,
    userId: r.userId,
    projectId: r.projectId,
    invoiceId: r.invoiceId,
    amount: r.amount,
    currency: r.currency,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote,
    decidedBy: r.decidedBy,
    requestedAt: isoOrNull(r.requestedAt),
    decidedAt: isoOrNull(r.decidedAt),
    refundedAt: isoOrNull(r.refundedAt),
  };
}

// Abuse guard: refund requests are money movement — strict per-user limit.
const createLimit = createMiddleware<Env>(async (c, next) => {
  const userId = c.get('userId');
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const rl = await checkRateLimit(c.env.KV, `refund:${ip}:${userId}`, 5, 600);
  if (!rl.allowed)
    return c.json({ ok: false, error: 'Too many requests' }, 429, {
      'Retry-After': String(rl.resetIn),
    });
  await next();
});

// ── User routes: POST /v1/billing/refunds · GET /v1/billing/refunds ──
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', requireUser);

/** POST / — request a refund for one of your paid invoices (7-day window). */
app.post(
  '/',
  createLimit,
  zValidator('json', refundRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const { invoiceId, reason } = c.req.valid('json');
    const db = getDb(c.env);

    // Ownership first — unknown or another user's invoice is a flat 404 (no oracle).
    const inv = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .get();
    if (!inv) return c.json({ ok: false, error: 'Invoice not found' }, 404);

    if (inv.status !== 'paid')
      return c.json(
        { ok: false, error: 'Only paid invoices can be refunded' },
        400
      );

    const billedMs = inv.billedAt ? inv.billedAt.getTime() : Number.NaN;
    if (!Number.isFinite(billedMs))
      return c.json(
        { ok: false, error: 'Invoice has no billing date — contact support' },
        400
      );
    const ageDays = (Date.now() - billedMs) / 86_400_000;
    if (ageDays > REFUND_WINDOW_DAYS)
      return c.json(
        {
          ok: false,
          error: `Refunds are only available within ${REFUND_WINDOW_DAYS} days of billing (this charge is ${Math.floor(ageDays)} days old)`,
        },
        400
      );

    // One live request per invoice (rejected/failed may be re-filed once reviewed).
    const existing = await db
      .select({ id: refundRequests.id, status: refundRequests.status })
      .from(refundRequests)
      .where(eq(refundRequests.invoiceId, inv.id))
      .all();
    if (existing.some((r) => r.status === 'pending' || r.status === 'approved'))
      return c.json(
        {
          ok: false,
          error: 'A refund request for this invoice is already under review',
        },
        409
      );
    if (existing.some((r) => r.status === 'completed'))
      return c.json(
        { ok: false, error: 'This invoice was already refunded' },
        409
      );

    // Abuse guard: max N requests per rolling 90 days.
    const windowStart = new Date(Date.now() - 90 * 86_400_000);
    const recent = await db
      .select({ id: refundRequests.id })
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.userId, userId),
          gte(refundRequests.requestedAt, windowStart)
        )
      )
      .all();
    if (recent.length >= REFUND_MAX_REQUESTS_PER_90D)
      return c.json(
        {
          ok: false,
          error: `Refund request limit reached (${REFUND_MAX_REQUESTS_PER_90D} per 90 days) — contact support for manual review`,
        },
        429
      );

    const created = await db
      .insert(refundRequests)
      .values({
        userId,
        projectId: inv.projectId,
        invoiceId: inv.id,
        paddleTransactionId: inv.paddleTransactionId,
        amount: inv.amount,
        currency: inv.currency,
        reason: reason.trim(),
        status: 'pending',
      })
      .returning()
      .get();

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'refund_requested',
        refundId: created.id,
        userId,
        invoiceId: inv.id,
        amount: inv.amount,
      })
    );
    return c.json(
      {
        ok: true,
        refund: serialize(created),
        reviewEta: 'within 5 business days',
      },
      201
    );
  }
);

/** GET / — your own refund requests (newest first). */
app.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);
  const list = await db
    .select()
    .from(refundRequests)
    .where(eq(refundRequests.userId, userId))
    .orderBy(desc(refundRequests.requestedAt))
    .limit(50)
    .all();
  return c.json({ ok: true, refunds: list.map(serialize) });
});

export default app;

// ── Admin routes: mount at /v1/admin/refunds (requireAdmin) ──
// Same posture as /v1/admin/plans (secret bearer or valid session).
// Self-approval is blocked: decidedBy must differ from the requester,
// so a session user can never approve their own refund.
export const adminRefunds = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();
adminRefunds.use('*', requireAdmin);

/** GET /v1/admin/refunds?status=&projectId= — review queue. */
adminRefunds.get('/', async (c) => {
  const db = getDb(c.env);
  const status = c.req.query('status');
  const projectId = c.req.query('projectId');
  const valid =
    status === undefined ||
    ['pending', 'approved', 'rejected', 'completed', 'failed'].includes(status);
  if (!valid) return c.json({ ok: false, error: 'Invalid status filter' }, 400);
  const list = await db
    .select()
    .from(refundRequests)
    .where(
      and(
        status ? eq(refundRequests.status, status as 'pending') : undefined,
        projectId ? eq(refundRequests.projectId, projectId) : undefined
      )
    )
    .orderBy(desc(refundRequests.requestedAt))
    .limit(100)
    .all();
  return c.json({ ok: true, refunds: list.map(serialize) });
});

/** POST /v1/admin/refunds/:id/approve — move REAL money via Paddle. */
adminRefunds.post(
  '/:id/approve',
  zValidator('json', refundDecisionSchema),
  async (c) => {
    const id = c.req.param('id');
    const { note } = c.req.valid('json');
    const db = getDb(c.env);
    const decidedBy =
      c.get('userId') ??
      `bearer:${(c.req.header('Authorization') ?? '').slice(0, 12)}`;

    const req = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .get();
    if (!req)
      return c.json({ ok: false, error: 'Refund request not found' }, 404);
    if (req.status !== 'pending')
      return c.json(
        { ok: false, error: `Request is already ${req.status}` },
        409
      );
    if (req.userId === decidedBy)
      return c.json(
        {
          ok: false,
          error: 'Self-approval is not allowed — another admin must review',
        },
        403
      );

    const environment = await resolveProjectEnvironment(c.env, req.projectId);
    const config = getPaddleConfig(c.env, environment);
    const { createFullRefundAdjustment, cancelSubscriptionAtPeriodEnd } =
      await import('../services/paddle.service');

    // 1) Real Paddle refund. ANY failure → `failed`, never fake success.
    let adjustmentId: string;
    try {
      const adj = await createFullRefundAdjustment(
        config,
        req.paddleTransactionId,
        note ?? req.reason
      );
      adjustmentId = adj.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'refund_paddle_failed',
          refundId: id,
          err: msg,
        })
      );
      await db
        .update(refundRequests)
        .set({
          status: 'failed',
          adminNote: `Paddle error: ${msg}`.slice(0, 1000),
          decidedBy,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(refundRequests.id, id));
      return c.json({ ok: false, error: `Paddle refund failed: ${msg}` }, 502);
    }

    // 2) Record approval + completion (Paddle adjustments apply immediately;
    //    the adjustment.approved webhook flips the invoice to `refunded` too).
    const now = new Date();
    const updated = await db
      .update(refundRequests)
      .set({
        status: 'completed',
        paddleAdjustmentId: adjustmentId,
        adminNote: note ?? null,
        decidedBy,
        decidedAt: now,
        refundedAt: now,
        updatedAt: now,
      })
      .where(eq(refundRequests.id, id))
      .returning()
      .get();

    await db
      .update(invoices)
      .set({ status: 'refunded', updatedAt: new Date() })
      .where(eq(invoices.id, req.invoiceId));

    // 3) Best-effort: stop future billing on the refunded subscription so the
    //    user is not charged again next period. Never fails the refund itself.
    let subscriptionCanceled = false;
    try {
      const inv = await db
        .select({ subscriptionId: invoices.subscriptionId })
        .from(invoices)
        .where(eq(invoices.id, req.invoiceId))
        .get();
      if (inv?.subscriptionId) {
        const sub = await db
          .select({
            paddleSubscriptionId: subscriptions.paddleSubscriptionId,
            status: subscriptions.status,
          })
          .from(subscriptions)
          .where(eq(subscriptions.id, inv.subscriptionId))
          .get();
        if (sub?.paddleSubscriptionId && sub.status !== 'canceled') {
          await cancelSubscriptionAtPeriodEnd(config, sub.paddleSubscriptionId);
          await db
            .update(subscriptions)
            .set({ cancelAtPeriodEnd: true })
            .where(eq(subscriptions.id, inv.subscriptionId));
          subscriptionCanceled = true;
        }
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'warn',
          msg: 'refund_subscription_cancel_failed',
          refundId: id,
          err: err instanceof Error ? err.message : String(err),
        })
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'refund_completed',
        refundId: id,
        adjustmentId,
        subscriptionCanceled,
      })
    );
    return c.json({
      ok: true,
      refund: serialize(updated),
      subscriptionCanceled,
    });
  }
);

/** POST /v1/admin/refunds/:id/reject — decline with a reason. */
adminRefunds.post(
  '/:id/reject',
  zValidator('json', refundDecisionSchema),
  async (c) => {
    const id = c.req.param('id');
    const { note } = c.req.valid('json');
    if (!note)
      return c.json(
        { ok: false, error: 'A rejection reason (note) is required' },
        400
      );
    const db = getDb(c.env);
    const decidedBy =
      c.get('userId') ??
      `bearer:${(c.req.header('Authorization') ?? '').slice(0, 12)}`;

    const req = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, id))
      .get();
    if (!req)
      return c.json({ ok: false, error: 'Refund request not found' }, 404);
    if (req.status !== 'pending')
      return c.json(
        { ok: false, error: `Request is already ${req.status}` },
        409
      );
    if (req.userId === decidedBy)
      return c.json(
        {
          ok: false,
          error: 'Self-review is not allowed — another admin must decide',
        },
        403
      );

    const updated = await db
      .update(refundRequests)
      .set({
        status: 'rejected',
        adminNote: note,
        decidedBy,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, id))
      .returning()
      .get();
    return c.json({ ok: true, refund: serialize(updated) });
  }
);
