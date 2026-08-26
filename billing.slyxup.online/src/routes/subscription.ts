import { Hono } from 'hono';

import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { subscriptions } from '../lib/schema';
import { isoOrNull } from '../lib/serialize';
import type { Env } from '../middleware/auth';
import { requireUser } from '../middleware/auth';

// ── Current-user subscription endpoints (session cookie or Bearer) ──
const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();

app.use('*', requireUser);

/** GET /v1/billing/subscription — current live subscription (any project) */
app.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  const sub = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        ne(subscriptions.status, 'canceled')
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .get();

  if (!sub) return c.json({ ok: true, subscription: null });
  return c.json({
    ok: true,
    subscription: {
      id: sub.id,
      projectId: sub.projectId,
      userId: sub.userId,
      planId: sub.planId,
      status: sub.status,
      currentPeriodStart: isoOrNull(sub.currentPeriodStart),
      currentPeriodEnd: isoOrNull(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  });
});

/** POST /v1/billing/subscription/cancel — cancel at period end */
app.post('/cancel', async (c) => {
  const apiKey = c.env.PADDLE_API_KEY;
  if (!apiKey)
    return c.json({ ok: false, error: 'Billing not configured' }, 501);

  const userId = c.get('userId');
  const db = getDb(c.env);
  const sub = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active'))
    )
    .orderBy(desc(subscriptions.createdAt))
    .get();

  const target =
    sub ??
    (
      await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
    )[0];

  if (!target || !target.paddleSubscriptionId)
    return c.json({ ok: false, error: 'No active subscription' }, 404);

  const config = {
    apiKey,
    environment: (c.env.PADDLE_ENVIRONMENT === 'production'
      ? 'production'
      : 'sandbox') as 'sandbox' | 'production',
  };
  const { cancelSubscriptionAtPeriodEnd } = await import(
    '../services/paddle.service'
  );
  await cancelSubscriptionAtPeriodEnd(config, target.paddleSubscriptionId);

  // Optimistic local flag; authoritative state arrives via subscription.updated webhook
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(subscriptions.id, target.id));

  return c.json({ ok: true });
});

/** POST /v1/billing/subscription/resume — undo scheduled cancellation */
app.post('/resume', async (c) => {
  const apiKey = c.env.PADDLE_API_KEY;
  if (!apiKey)
    return c.json({ ok: false, error: 'Billing not configured' }, 501);

  const userId = c.get('userId');
  const db = getDb(c.env);
  const sub = await db
    .select({
      id: subscriptions.id,
      paddleSubscriptionId: subscriptions.paddleSubscriptionId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.cancelAtPeriodEnd, true),
        ne(subscriptions.status, 'canceled')
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .get();

  if (!sub?.paddleSubscriptionId)
    return c.json({ ok: false, error: 'Nothing to resume' }, 404);

  const config = {
    apiKey,
    environment: (c.env.PADDLE_ENVIRONMENT === 'production'
      ? 'production'
      : 'sandbox') as 'sandbox' | 'production',
  };
  const { resumeSubscription } = await import('../services/paddle.service');
  await resumeSubscription(config, sub.paddleSubscriptionId);

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false })
    .where(eq(subscriptions.id, sub.id));

  return c.json({ ok: true });
});

export default app;
