import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getDb } from '../lib/db';
import { conflict, notConfigured, notFound } from '../lib/http';
import { checkRateLimit } from '../lib/rate-limit';
import { customers, plans, subscriptions } from '../lib/schema';
import type { Env } from '../middleware/auth';
import { requireUser } from '../middleware/auth';
import { checkoutSchema } from '../schemas/billing';

// ── POST /v1/billing/checkout — create Paddle hosted-checkout transaction ──

const rateLimit = createMiddleware<Env>(async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const userId = c.get('userId');
  const rl = await checkRateLimit(c.env.KV, `checkout:${ip}:${userId}`, 10, 60);
  if (!rl.allowed)
    return c.json({ ok: false, error: 'Too many requests' }, 429, {
      'Retry-After': String(rl.resetIn),
    });
  await next();
});

const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();

app.post(
  '/',
  requireUser,
  rateLimit,
  zValidator('json', checkoutSchema),
  async (c) => {
    const apiKey = c.env.PADDLE_API_KEY;
    if (!apiKey) throw notConfigured();

    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const { planId, successUrl } = c.req.valid('json');

    const db = getDb(c.env);
    let plan = await db.select().from(plans).where(eq(plans.id, planId)).get();
    // Accept paddlePriceId as well (UI sometimes sends priceId) — fixes 404
    if (!plan) {
      plan = await db
        .select()
        .from(plans)
        .where(eq(plans.paddlePriceId, planId))
        .get();
    }
    if (!plan || !plan.isActive)
      return c.json(
        {
          ok: false,
          code: 'PLAN_NOT_FOUND',
          error:
            'Plan not found. Seed real pri_... via admin or check projectId.',
        },
        404
      );

    // B2: Only block checkout if there's an active or trialing subscription.
    // Allow re-engagement when the only existing sub is paused or past_due.
    const blocking = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.projectId, plan.projectId),
          inArray(subscriptions.status, ['active', 'trialing'])
        )
      )
      .get();
    if (blocking)
      throw conflict('Active subscription already exists for this project');

    const config = {
      apiKey,
      environment: (c.env.PADDLE_ENVIRONMENT === 'production'
        ? 'production'
        : 'sandbox') as 'sandbox' | 'production',
    };

    // B8: Lookup our customer row by userId, not Paddle by email.
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .get();

    let paddleCustomerId: string;
    if (existingCustomer) {
      paddleCustomerId = existingCustomer.paddleCustomerId ?? '';
    } else {
      const { createPaddleCustomer } = await import(
        '../services/paddle.service'
      );
      try {
        const customer = await createPaddleCustomer(config, userEmail);
        paddleCustomerId = customer.id;
      } catch (err) {
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'createPaddleCustomer failed',
            userId,
            email: userEmail,
            err: err instanceof Error ? err.message : String(err),
          })
        );
        throw err;
      }
    }

    // B3: Set updatedAt on conflict
    await db
      .insert(customers)
      .values({
        userId,
        email: userEmail,
        paddleCustomerId,
      })
      .onConflictDoUpdate({
        target: customers.userId,
        set: {
          email: userEmail,
          paddleCustomerId,
          updatedAt: new Date(),
        },
      });

    // Only send successUrl if provided — unapproved domains (e.g. localhost) make
    // Paddle reject the transaction; without it Paddle uses the default payment link.
    const { createCheckout } = await import('../services/paddle.service');
    let checkout: { checkoutUrl: string; transactionId: string };
    try {
      checkout = await createCheckout(
        config,
        plan.paddlePriceId,
        paddleCustomerId,
        successUrl,
        { userId, projectId: plan.projectId, planId: plan.id }
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'createCheckout failed',
          planId: plan.id,
          paddlePriceId: plan.paddlePriceId,
          paddleCustomerId,
          err: err instanceof Error ? err.message : String(err),
        })
      );
      throw err;
    }

    // Subscription row is created by the `subscription.created` webhook (source of truth).
    return c.json({ ok: true, checkoutUrl: checkout.checkoutUrl });
  }
);

export default app;
