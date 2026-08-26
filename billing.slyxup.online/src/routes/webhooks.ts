import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { invoices, plans, subscriptions, webhookEvents } from '../lib/schema';
import { verifyWebhookSignature } from '../services/paddle.service';

// ── POST /v1/webhooks/paddle — Paddle Billing notifications ──
// Configure in Paddle Dashboard > Developer tools > Notifications.
// Events handled: subscription.*, transaction.completed, transaction.paid, adjustment.updated

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
  return (SUB_STATUSES as readonly string[]).includes(status ?? '')
    ? (status as (typeof SUB_STATUSES)[number])
    : 'past_due';
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
        canceledAt: values.canceledAt,
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
  await db
    .insert(invoices)
    .values({
      paddleTransactionId: data.id,
      subscriptionId: subscriptionId ?? null,
      userId,
      projectId,
      amount: total, // cents (Paddle totals are strings of cents)
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
      },
    });
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
    .set({ status: 'refunded' })
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

  // Idempotency guard — unique paddle_event_id; duplicates are acked with 200
  try {
    await db.insert(webhookEvents).values({
      paddleEventId: event.event_id,
      eventType: event.event_type,
      occurredAt: parseDate(event.occurred_at),
      payload: event as unknown as Record<string, unknown>,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  try {
    if (event.event_type.startsWith('subscription.')) {
      await applySubscriptionEvent(db, event.data as unknown as SubData);
    } else if (
      event.event_type === 'transaction.completed' ||
      event.event_type === 'transaction.paid'
    ) {
      await applyTransactionCompleted(db, event.data as unknown as TxData);
    } else if (event.event_type === 'adjustment.updated') {
      await applyAdjustment(db, event.data as AdjustmentData);
    }
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'webhook processing failed',
        event_id: event.event_id,
        event_type: event.event_type,
        err: e instanceof Error ? e.message : String(e),
      })
    );
    // Ack to prevent retry storms on app bugs; event row is logged for replay
  }

  return c.json({ ok: true });
});

export default app;
