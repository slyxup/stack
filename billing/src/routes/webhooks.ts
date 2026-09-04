import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { invoices, plans, subscriptions, webhookEvents } from '../lib/schema';
import { verifyWebhookSignature } from '../services/paddle.service';

// ── POST /v1/webhooks/paddle — Paddle Billing notifications ──
// Configure in Paddle Dashboard > Developer tools > Notifications.
// Events handled: subscription.*, transaction.*, adjustment.updated

interface PaddleEvent<T = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: T;
}

interface SubData {
  id: string;
  status?: string;
  customer_id?: string;
  items?: { price?: { id?: string } }[];
  current_billing_period?: {
    starts_at?: string | null;
    ends_at?: string | null;
  };
  scheduled_change?: { action?: string | null } | null;
  custom_data?: { userId?: string; projectId?: string; planId?: string } | null;
}

interface TxData {
  id: string;
  status?: string;
  subscription_id?: string | null;
  invoice_number?: string | null;
  billed_at?: string | null;
  details?: { totals?: { total?: string; currency_code?: string } };
  custom_data?: { userId?: string; projectId?: string; planId?: string } | null;
}

interface AdjustmentData {
  action?: string;
  status?: string;
  transaction_id?: string;
}

const SUB_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'paused',
  'canceled',
] as const;

function mapSubStatus(
  status: string | undefined
): (typeof SUB_STATUSES)[number] {
  if ((SUB_STATUSES as readonly string[]).includes(status ?? ''))
    return status as (typeof SUB_STATUSES)[number];
  // B14: Log unmapped statuses
  console.warn(
    JSON.stringify({
      level: 'warn',
      msg: 'Unknown Paddle subscription status mapped to past_due',
      raw_status: status,
    })
  );
  return 'past_due';
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function applySubscriptionEvent(
  db: ReturnType<typeof getDb>,
  data: SubData
): Promise<void> {
  const priceId = data.items?.[0]?.price?.id;
  if (!data.id || !priceId) return;

  // Resolve plan by Paddle price id
  const plan = await db
    .select({ id: plans.id, projectId: plans.projectId })
    .from(plans)
    .where(eq(plans.paddlePriceId, priceId))
    .get();

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paddleSubscriptionId, data.id))
    .get();

  // Identity: custom_data > existing row > resolved plan. Skip if we can't attribute it.
  const userId = data.custom_data?.userId ?? existing?.userId;
  const projectId =
    data.custom_data?.projectId ?? plan?.projectId ?? existing?.projectId;
  const planId = data.custom_data?.planId ?? plan?.id ?? existing?.planId;
  if (!userId || !projectId || !planId) return; // unknown plan/user — ignore

  const canceled = mapSubStatus(data.status) === 'canceled';
  const values = {
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customer_id ?? null,
    userId,
    projectId,
    planId,
    status: mapSubStatus(data.status),
    currentPeriodStart: parseDate(data.current_billing_period?.starts_at),
    currentPeriodEnd: parseDate(data.current_billing_period?.ends_at),
    cancelAtPeriodEnd: !canceled && data.scheduled_change?.action === 'cancel',
    canceledAt: canceled ? new Date() : null,
  };

  // B10: Preserve the earliest cancellation timestamp — don't overwrite an existing
  // canceledAt with null when a non-canceled event arrives later.
  const canceledAt =
    canceled || existing?.canceledAt
      ? (existing?.canceledAt ?? values.canceledAt)
      : null;

  // B3: Set updatedAt on conflict
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.paddleSubscriptionId,
      set: {
        paddleCustomerId: values.paddleCustomerId,
        userId: values.userId,
        projectId: values.projectId,
        planId: values.planId,
        status: values.status,
        currentPeriodStart: values.currentPeriodStart,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        canceledAt,
        updatedAt: new Date(),
      },
    });
}

async function applyTransactionCompleted(
  db: ReturnType<typeof getDb>,
  data: TxData
): Promise<void> {
  if (!data.id) return;
  const total = Number(data.details?.totals?.total ?? Number.NaN);
  if (!Number.isFinite(total)) return;

  let subscriptionId: string | undefined;
  let userId = data.custom_data?.userId;
  let projectId = data.custom_data?.projectId;

  if (data.subscription_id) {
    const sub = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        projectId: subscriptions.projectId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.paddleSubscriptionId, data.subscription_id))
      .get();
    if (sub) {
      subscriptionId = sub.id;
      userId ??= sub.userId;
      projectId ??= sub.projectId;
    }
  }
  if (!userId || !projectId) return; // cannot attribute — skip

  const paid = data.status === 'completed' || data.status === 'paid';
  // B3: Set updatedAt on conflict
  await db
    .insert(invoices)
    .values({
      paddleTransactionId: data.id,
      subscriptionId: subscriptionId ?? null,
      userId,
      projectId,
      amount: total,
      currency: (data.details?.totals?.currency_code ?? 'USD').toUpperCase(),
      status: paid ? 'paid' : 'pending',
      invoiceNumber: data.invoice_number ?? null,
      billedAt: parseDate(data.billed_at),
    })
    .onConflictDoUpdate({
      target: invoices.paddleTransactionId,
      set: {
        status: paid ? 'paid' : 'pending',
        invoiceNumber: data.invoice_number ?? null,
        billedAt: parseDate(data.billed_at),
        updatedAt: new Date(),
      },
    });
}

// B4: Handle transaction.canceled — correct invoice status
async function applyTransactionCanceled(
  db: ReturnType<typeof getDb>,
  data: TxData
): Promise<void> {
  if (!data.id) return;
  // Set invoice to pending if it was previously marked paid
  await db
    .update(invoices)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(invoices.paddleTransactionId, data.id));
}

// B4: Handle transaction.partially_refunded
async function applyTransactionPartiallyRefunded(
  db: ReturnType<typeof getDb>,
  data: TxData
): Promise<void> {
  if (!data.id) return;
  await db
    .update(invoices)
    .set({ status: 'refunded', updatedAt: new Date() })
    .where(eq(invoices.paddleTransactionId, data.id));
}

async function applyAdjustment(
  db: ReturnType<typeof getDb>,
  data: AdjustmentData
): Promise<void> {
  // Approved refunds flip the original transaction's invoice to refunded
  if (data.action !== 'refund' || data.status !== 'approved') return;
  if (!data.transaction_id) return;
  await db
    .update(invoices)
    .set({ status: 'refunded', updatedAt: new Date() })
    .where(eq(invoices.paddleTransactionId, data.transaction_id));
}

const app = new Hono<{
  Bindings: Record<string, unknown> & {
    DB: D1Database;
    PADDLE_WEBHOOK_SECRET?: string;
  };
}>();

app.post('/paddle', async (c) => {
  const secret = c.env.PADDLE_WEBHOOK_SECRET;
  if (!secret)
    return c.json({ ok: false, error: 'Billing not configured' }, 501);

  const raw = await c.req.text();
  const error = await verifyWebhookSignature(
    c.req.header('Paddle-Signature'),
    raw,
    secret
  );
  if (error) return c.json({ ok: false, error }, 401);

  let event: PaddleEvent;
  try {
    event = JSON.parse(raw) as PaddleEvent;
  } catch {
    return c.json({ ok: false, error: 'invalid JSON body' }, 400);
  }
  if (!event.event_id || !event.event_type)
    return c.json({ ok: false, error: 'missing event fields' }, 400);

  const db = getDb(c.env);

  // B6+B7: Idempotency guard — processedAt is NULL at insert, set only on success.
  // For duplicates: re-process failed events, skip completed ones.
  let isNewEvent = false;
  try {
    await db.insert(webhookEvents).values({
      paddleEventId: event.event_id,
      eventType: event.event_type,
      occurredAt: parseDate(event.occurred_at),
      payload: event as unknown as Record<string, unknown>,
      status: 'pending',
    });
    isNewEvent = true;
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      // Duplicate event — check if it previously failed (allow reprocessing)
      const existing = await db
        .select({ status: webhookEvents.status })
        .from(webhookEvents)
        .where(eq(webhookEvents.paddleEventId, event.event_id))
        .get();
      if (existing?.status !== 'failed') {
        return c.json({ ok: true, duplicate: true });
      }
      // Update existing failed event to pending for reprocessing
      await db
        .update(webhookEvents)
        .set({ status: 'pending', processedAt: null })
        .where(eq(webhookEvents.paddleEventId, event.event_id));
    } else {
      throw e;
    }
  }

  // B6: Processing errors are re-thrown so Paddle retries.
  // Only ack success. processedAt is set after processing (B7).
  if (event.event_type.startsWith('subscription.')) {
    await applySubscriptionEvent(db, event.data as unknown as SubData);
  } else if (
    event.event_type === 'transaction.completed' ||
    event.event_type === 'transaction.paid'
  ) {
    await applyTransactionCompleted(db, event.data as unknown as TxData);
  } else if (event.event_type === 'adjustment.updated') {
    await applyAdjustment(db, event.data as AdjustmentData);
  } else if (event.event_type === 'transaction.canceled') {
    // B4
    await applyTransactionCanceled(db, event.data as unknown as TxData);
  } else if (event.event_type === 'transaction.partially_refunded') {
    // B4
    await applyTransactionPartiallyRefunded(
      db,
      event.data as unknown as TxData
    );
  }

  // B6+B7: Mark as completed only after successful processing
  await db
    .update(webhookEvents)
    .set({ processedAt: new Date(), status: 'completed' })
    .where(eq(webhookEvents.paddleEventId, event.event_id));

  return c.json({ ok: true });
});

export default app;
