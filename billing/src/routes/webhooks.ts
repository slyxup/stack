import { Hono } from 'hono';

import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { bodyLimit } from 'hono/body-limit';
import { getDb } from '../lib/db';
import {
  checkoutIntents,
  invoices,
  plans,
  subscriptions,
  webhookEvents,
} from '../lib/schema';
import {
  type PaddleConfig,
  getTransaction,
  verifyWebhookSignature,
} from '../services/paddle.service';

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
  custom_data?: {
    userId?: string;
    projectId?: string;
    planId?: string;
    checkoutIntentId?: string;
  } | null;
}

interface TxData {
  customer_id?: string;
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
  data: SubData,
  occurredAt: string,
  config: PaddleConfig
): Promise<void> {
  const priceId = data.items?.[0]?.price?.id;
  if (!data.id || !priceId) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'subscription webhook missing id/priceId',
        subId: data.id,
        priceId,
      })
    );
    return;
  }

  // Resolve plan by Paddle price id
  const plan = await db
    .select({ id: plans.id, projectId: plans.projectId })
    .from(plans)
    .where(
      and(
        eq(plans.paddlePriceId, priceId),
        data.custom_data?.planId
          ? eq(plans.id, data.custom_data.planId)
          : undefined
      )
    )
    .get();

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paddleSubscriptionId, data.id))
    .get();
  if (existing?.lastEventAt && existing.lastEventAt >= occurredAt) return;
  let intent = data.custom_data?.checkoutIntentId
    ? await db
        .select()
        .from(checkoutIntents)
        .where(eq(checkoutIntents.id, data.custom_data.checkoutIntentId))
        .get()
    : undefined;
  if (!existing) {
    if (!intent?.paddleTransactionId)
      throw new Error('Server checkout attribution is not ready');
    const transaction = await getTransaction(
      config,
      intent.paddleTransactionId
    );
    if (
      transaction.subscription_id !== data.id ||
      transaction.customer_id !== intent.paddleCustomerId ||
      !transaction.items?.some((item) => item.price.id === priceId)
    )
      throw new Error(
        'Subscription does not match the server-created transaction'
      );
    const claimed = await db
      .update(checkoutIntents)
      .set({ paddleSubscriptionId: data.id })
      .where(
        and(
          eq(checkoutIntents.id, intent.id),
          or(
            isNull(checkoutIntents.paddleSubscriptionId),
            eq(checkoutIntents.paddleSubscriptionId, data.id)
          )
        )
      )
      .returning();
    if (!claimed.length) throw new Error('Checkout attribution already used');
    intent = claimed[0];
  }

  // A client-supplied custom_data plan must match the actual paid price.
  if (
    !plan ||
    (data.custom_data?.projectId &&
      data.custom_data.projectId !== plan.projectId)
  ) {
    throw new Error(
      'Subscription price does not match the configured project plan'
    );
  }
  const userId = existing?.userId ?? intent?.userId;
  const projectId = plan.projectId;
  const planId = plan.id;
  if (
    intent &&
    (intent.projectId !== projectId ||
      intent.planId !== planId ||
      intent.paddleCustomerId !== data.customer_id)
  )
    throw new Error('Checkout plan/customer mismatch');
  if (
    existing &&
    (existing.projectId !== projectId ||
      (data.custom_data?.userId && data.custom_data.userId !== existing.userId))
  ) {
    throw new Error('Subscription identity cannot be reassigned');
  }
  if (!userId || !projectId || !planId) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'subscription webhook could not attribute',
        subId: data.id,
        priceId,
        customData: data.custom_data,
        resolvedPlanId: plan?.id,
        resolvedProjectId: plan?.projectId,
        existingUserId: existing?.userId,
        existingProjectId: existing?.projectId,
        existingPlanId: existing?.planId,
      })
    );
    return; // unknown plan/user — ignore
  }

  const canceled = mapSubStatus(data.status) === 'canceled';
  const values = {
    paddleSubscriptionId: data.id,
    lastEventAt: occurredAt,
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
        lastEventAt: occurredAt,
        updatedAt: new Date(),
      },
      setWhere: or(
        isNull(subscriptions.lastEventAt),
        lt(subscriptions.lastEventAt, occurredAt)
      ),
    });
}

async function applyTransactionCompleted(
  db: ReturnType<typeof getDb>,
  data: TxData,
  occurredAt: string
): Promise<void> {
  if (!data.id) return;
  const total = Number(data.details?.totals?.total ?? Number.NaN);
  if (!Number.isFinite(total)) return;

  let subscriptionId: string | undefined;
  const intent = await db
    .select()
    .from(checkoutIntents)
    .where(eq(checkoutIntents.paddleTransactionId, data.id))
    .get();
  let userId = intent?.userId;
  let projectId = intent?.projectId;
  if (intent && data.customer_id !== intent.paddleCustomerId)
    throw new Error('Transaction customer mismatch');

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
  if (!userId || !projectId)
    throw new Error('Transaction attribution not ready');

  const paid = data.status === 'completed' || data.status === 'paid';
  // B3: Set updatedAt on conflict
  await db
    .insert(invoices)
    .values({
      paddleTransactionId: data.id,
      lastEventAt: occurredAt,
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
        lastEventAt: occurredAt,
      },
      setWhere: or(
        isNull(invoices.lastEventAt),
        lt(invoices.lastEventAt, occurredAt)
      ),
    });
}

// B4: Handle transaction.canceled — correct invoice status
async function applyTransactionCanceled(
  db: ReturnType<typeof getDb>,
  data: TxData,
  occurredAt: string
): Promise<void> {
  if (!data.id) return;
  // Set invoice to pending if it was previously marked paid
  await db
    .update(invoices)
    .set({ status: 'pending', updatedAt: new Date(), lastEventAt: occurredAt })
    .where(
      and(
        eq(invoices.paddleTransactionId, data.id),
        or(isNull(invoices.lastEventAt), lt(invoices.lastEventAt, occurredAt))
      )
    );
}

// B4: Handle transaction.partially_refunded
async function applyTransactionPartiallyRefunded(
  db: ReturnType<typeof getDb>,
  data: TxData,
  occurredAt: string
): Promise<void> {
  if (!data.id) return;
  await db
    .update(invoices)
    .set({ status: 'refunded', updatedAt: new Date(), lastEventAt: occurredAt })
    .where(
      and(
        eq(invoices.paddleTransactionId, data.id),
        or(isNull(invoices.lastEventAt), lt(invoices.lastEventAt, occurredAt))
      )
    );
}

async function applyAdjustment(
  db: ReturnType<typeof getDb>,
  data: AdjustmentData,
  occurredAt: string
): Promise<void> {
  // Approved refunds flip the original transaction's invoice to refunded
  if (data.action !== 'refund' || data.status !== 'approved') return;
  if (!data.transaction_id) return;
  await db
    .update(invoices)
    .set({ status: 'refunded', updatedAt: new Date(), lastEventAt: occurredAt })
    .where(
      and(
        eq(invoices.paddleTransactionId, data.transaction_id),
        or(isNull(invoices.lastEventAt), lt(invoices.lastEventAt, occurredAt))
      )
    );
}

const app = new Hono<{
  Bindings: Record<string, unknown> & {
    DB: D1Database;
    PADDLE_WEBHOOK_SECRET?: string;
    PADDLE_API_KEY?: string;
    PADDLE_ENVIRONMENT?: string;
  };
}>();
app.use('/paddle', bodyLimit({ maxSize: 1024 * 1024 }));

// GET /v1/webhooks/status — check if webhooks have been received (diagnostic)
app.get('/status', async (c) => {
  const db = getDb(c.env);
  const hasSecret = !!c.env.PADDLE_WEBHOOK_SECRET;
  const recentEvents = await db
    .select({
      eventType: webhookEvents.eventType,
      status: webhookEvents.status,
      occurredAt: webhookEvents.occurredAt,
    })
    .from(webhookEvents)
    .orderBy(webhookEvents.occurredAt)
    .limit(5)
    .all();
  const totalEvents = await db
    .select({ count: webhookEvents.id })
    .from(webhookEvents)
    .all();
  return c.json({
    ok: true,
    webhookConfigured: hasSecret,
    totalEvents: totalEvents.length,
    recentEvents,
    webhookUrl: 'https://billing.slyxup.online/v1/webhooks/paddle',
  });
});

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
  if (
    !event ||
    typeof event.event_id !== 'string' ||
    typeof event.event_type !== 'string' ||
    !parseDate(event.occurred_at) ||
    !event.data ||
    typeof event.data !== 'object'
  )
    return c.json({ ok: false, error: 'missing event fields' }, 400);

  const db = getDb(c.env);
  const occurredAt = new Date(event.occurred_at).toISOString();
  const leaseToken = crypto.randomUUID();
  const leaseUntil = new Date(Date.now() + 120000);

  // B6+B7: Idempotency guard — processedAt is NULL at insert, set only on success.
  // For duplicates: re-process failed events, skip completed ones.
  try {
    await db.insert(webhookEvents).values({
      paddleEventId: event.event_id,
      eventType: event.event_type,
      occurredAt: parseDate(event.occurred_at),
      payload: event as unknown as Record<string, unknown>,
      status: 'pending',
      leaseToken,
      leaseUntil,
    });
  } catch (e) {
    if (isUniqueConflict(e)) {
      // Duplicate event — check if it previously failed (allow reprocessing)
      const existing = await db
        .select({ status: webhookEvents.status })
        .from(webhookEvents)
        .where(eq(webhookEvents.paddleEventId, event.event_id))
        .get();
      if (existing?.status === 'completed') {
        return c.json({ ok: true, duplicate: true });
      }
      // Update existing failed event to pending for reprocessing
      const claimed = await db
        .update(webhookEvents)
        .set({ status: 'pending', processedAt: null, leaseToken, leaseUntil })
        .where(
          and(
            eq(webhookEvents.paddleEventId, event.event_id),
            or(
              eq(webhookEvents.status, 'failed'),
              and(
                eq(webhookEvents.status, 'pending'),
                or(
                  isNull(webhookEvents.leaseUntil),
                  lte(webhookEvents.leaseUntil, new Date())
                )
              )
            )
          )
        )
        .returning({ id: webhookEvents.id });
      if (!claimed.length)
        return c.json(
          { ok: false, error: 'Event processing is still pending' },
          503
        );
    } else {
      throw e;
    }
  }

  // B6: Processing errors are re-thrown so Paddle retries.
  // Only ack success. processedAt is set after processing (B7).
  try {
    if (event.event_type.startsWith('subscription.')) {
      if (!c.env.PADDLE_API_KEY)
        throw new Error('Paddle API key required for attribution');
      await applySubscriptionEvent(
        db,
        event.data as unknown as SubData,
        occurredAt,
        {
          apiKey: c.env.PADDLE_API_KEY,
          environment:
            c.env.PADDLE_ENVIRONMENT === 'production'
              ? 'production'
              : 'sandbox',
        }
      );
    } else if (
      event.event_type === 'transaction.completed' ||
      event.event_type === 'transaction.paid'
    ) {
      await applyTransactionCompleted(
        db,
        event.data as unknown as TxData,
        occurredAt
      );
    } else if (event.event_type === 'adjustment.updated') {
      await applyAdjustment(db, event.data as AdjustmentData, occurredAt);
    } else if (event.event_type === 'transaction.canceled') {
      // B4
      await applyTransactionCanceled(
        db,
        event.data as unknown as TxData,
        occurredAt
      );
    } else if (event.event_type === 'transaction.partially_refunded') {
      // B4
      await applyTransactionPartiallyRefunded(
        db,
        event.data as unknown as TxData,
        occurredAt
      );
    }

    // B6+B7: Mark as completed only after successful processing
    await db
      .update(webhookEvents)
      .set({
        processedAt: new Date(),
        status: 'completed',
        leaseUntil: null,
        leaseToken: null,
      })
      .where(
        and(
          eq(webhookEvents.paddleEventId, event.event_id),
          eq(webhookEvents.leaseToken, leaseToken)
        )
      );
  } catch (error) {
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        processedAt: null,
        leaseUntil: null,
        leaseToken: null,
      })
      .where(
        and(
          eq(webhookEvents.paddleEventId, event.event_id),
          eq(webhookEvents.leaseToken, leaseToken)
        )
      );
    throw error;
  }

  return c.json({ ok: true });
});

export default app;

function isUniqueConflict(error: unknown): boolean {
  let cause = error;
  for (let depth = 0; cause instanceof Error && depth < 5; depth++) {
    if (cause.message.includes('UNIQUE constraint failed')) return true;
    cause = cause.cause;
  }
  return false;
}
