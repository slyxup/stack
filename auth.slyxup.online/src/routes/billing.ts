import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { invoices, plans, sessions, subscriptions, users } from '../lib/schema';

const billing = new Hono<{
  Bindings: {
    DB: D1Database;
    PADDLE_API_KEY?: string;
    PADDLE_ENVIRONMENT?: string;
  };
  Variables: { userId: string; userEmail: string };
}>();

import { createMiddleware } from 'hono/factory';

const requireUser = createMiddleware<{
  Bindings: { DB: D1Database };
  Variables: { userId: string; userEmail: string };
}>(async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const token = auth.slice(7).trim();
  const db = getDb(c.env);
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session) return c.json({ ok: false, error: 'Invalid session' }, 401);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  if (!user || user.blocked)
    return c.json({ ok: false, error: 'Blocked or invalid' }, 403);
  c.set('userId', user.id);
  c.set('userEmail', user.email);
  await next();
});

// ── Public: List plans for a project ──
billing.get('/plans', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);
  const db = getDb(c.env);
  const list = await db
    .select()
    .from(plans)
    .where(eq(plans.projectId, projectId))
    .all();
  return c.json({
    ok: true,
    plans: list
      .filter((p) => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        features: p.features ?? [],
        isPopular: p.isPopular ?? false,
      })),
  });
});

// ── Authenticated routes ──
billing.use('/subscription', requireUser);
billing.use('/checkout', requireUser);
billing.use('/invoices', requireUser);

// ── Get current subscription ──
billing.get('/subscription', async (c) => {
  const userId = c.get('userId');
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);
  const db = getDb(c.env);
  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .all();
  const filtered = sub.filter(
    (s) => s.projectId === projectId && s.status !== 'canceled'
  );
  if (filtered.length === 0) return c.json({ ok: true, subscription: null });
  return c.json({ ok: true, subscription: filtered[0] });
});

// ── Create checkout URL ──
billing.post('/checkout', requireUser, async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  const body = await c.req
    .json<{ planId?: string; successUrl?: string }>()
    .catch(() => ({
      planId: undefined as string | undefined,
      successUrl: undefined as string | undefined,
    }));
  if (!body.planId) return c.json({ ok: false, error: 'planId required' }, 400);
  const apiKey = c.env.PADDLE_API_KEY;
  if (!apiKey)
    return c.json({ ok: false, error: 'Billing not configured' }, 501);
  const db = getDb(c.env);
  const plan = await db
    .select()
    .from(plans)
    .where(eq(plans.id, body.planId))
    .get();
  if (!plan) return c.json({ ok: false, error: 'Plan not found' }, 404);
  const config = {
    apiKey,
    environment: (c.env.PADDLE_ENVIRONMENT ?? 'sandbox') as
      | 'sandbox'
      | 'production',
  };
  const { createCheckout } = await import('../services/billing.service');
  const successUrl =
    body.successUrl ?? `${c.req.header('Origin') ?? ''}/billing/success`;
  const checkout = await createCheckout(
    config,
    plan.paddlePriceId,
    userEmail,
    successUrl
  );
  // Create subscription record in trialing state
  await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    projectId: plan.projectId,
    userId,
    planId: plan.id,
    paddleSubscriptionId: checkout.transactionId,
    status: 'trialing',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return c.json({ ok: true, checkoutUrl: checkout.checkoutUrl });
});

// ── Cancel subscription ──
billing.post('/subscription/cancel', requireUser, async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
  return c.json({ ok: true });
});

// ── Invoices ──
billing.get('/invoices', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);
  const list = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .all();
  return c.json({ ok: true, invoices: list });
});

export default billing;
