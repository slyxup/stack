import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import {
  type Subscription,
  invoices,
  plans,
  subscriptions,
} from '../lib/schema';

const webhook = new Hono<{ Bindings: { DB: D1Database } }>();

/** Paddle webhook handler — receives subscription lifecycle events */
webhook.post('/paddle', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    event_type?: string;
    data?: {
      id?: string;
      customer_id?: string;
      status?: string;
      custom_data?: { project_id?: string; user_id?: string; plan_id?: string };
      items?: Array<{ price?: { id?: string } }>;
    };
  } | null;

  if (!body?.event_type || !body?.data) return c.json({ ok: true });

  const db = getDb(c.env);
  const eventType = body.event_type;
  const data = body.data;

  switch (eventType) {
    case 'subscription.created':
    case 'subscription.updated': {
      const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.paddleSubscriptionId, data.id ?? ''))
        .get();
      if (sub) {
        await db
          .update(subscriptions)
          .set({
            status: (data.status as Subscription['status']) ?? 'active',
            paddleCustomerId: data.customer_id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.paddleSubscriptionId, data.id ?? ''));
      }
      break;
    }
    case 'subscription.canceled': {
      await db
        .update(subscriptions)
        .set({
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.paddleSubscriptionId, data.id ?? ''));
      break;
    }
    case 'transaction.completed': {
      // Create invoice record
      const customData = data.custom_data;
      if (customData?.project_id && customData?.user_id) {
        await db.insert(invoices).values({
          id: crypto.randomUUID(),
          projectId: customData.project_id,
          userId: customData.user_id,
          paddleTransactionId: data.id,
          amount: 0,
          currency: 'USD',
          status: 'paid',
          billedAt: new Date(),
          createdAt: new Date(),
        });
        // Activate the subscription
        await db
          .update(subscriptions)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(subscriptions.paddleSubscriptionId, data.id ?? ''));
      }
      break;
    }
    default:
      break;
  }

  return c.json({ ok: true });
});

export default webhook;
