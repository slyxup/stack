import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getDb } from '../lib/db';
import { badRequest, conflict, notConfigured, notFound } from '../lib/http';
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
    const { planId, origin } = c.req.valid('json');

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

    // B8: Lookup our customer row by userId first, then by paddleCustomerId.
    const existingByUser = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .get();

    let paddleCustomerId: string;
    if (existingByUser) {
      paddleCustomerId = existingByUser.paddleCustomerId ?? '';
    } else {
      // Paddle may return an existing customer if the email matches — check
      // whether that paddleCustomerId is already owned by a different user
      // before creating a new one.
      try {
        const { createPaddleCustomer, findPaddleCustomerByEmail } =
          await import('../services/paddle.service');

        const existingPaddle = await findPaddleCustomerByEmail(
          config,
          userEmail
        );
        if (existingPaddle) {
          paddleCustomerId = existingPaddle.id;
        } else {
          const customer = await createPaddleCustomer(config, userEmail);
          paddleCustomerId = customer.id;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'createPaddleCustomer failed',
            userId,
            email: userEmail,
            err: msg,
          })
        );
        return c.json(
          {
            ok: false,
            code: 'PADDLE_ERROR',
            error: `Failed to create customer: ${msg}`,
          },
          502
        );
      }
    }

    // Check if this paddleCustomerId is already owned by a different user
    const existingByPaddle = await db
      .select()
      .from(customers)
      .where(eq(customers.paddleCustomerId, paddleCustomerId))
      .get();

    // B3: Upsert — handle both userId and paddleCustomerId unique constraints
    try {
      if (existingByPaddle && existingByPaddle.userId !== userId) {
        // Another user already owns this Paddle customer — just reference it
        // by linking this userId to the existing row (merge).
        await db
          .update(customers)
          .set({
            userId,
            email: userEmail,
            paddleCustomerId,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingByPaddle.id));
      } else {
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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'customer upsert failed',
          userId,
          paddleCustomerId,
          err: msg,
        })
      );
      return c.json(
        {
          ok: false,
          code: 'DB_ERROR',
          error: `Failed to save customer: ${msg}`,
        },
        500
      );
    }

    // The payment-link page MUST host Paddle.js (our /pay page on the approved
    // billing domain). Paddle appends ?_ptxn=<id> and returns it as
    // checkout.url. The buyer's post-payment landing is set inside /pay via
    // Paddle.Checkout.open({ settings: { successUrl } }); `origin` is the
    // return target carried through /pay → billing GET / → success page.
    // NOTE: client `successUrl` is intentionally NOT used as the payment link
    // (a non-Paddle.js page there strands the buyer with no way to pay).
    try {
      const { createCheckout } = await import('../services/paddle.service');
      const payBase = 'https://billing.slyxup.online/pay';
      const payParams = new URLSearchParams({ project_id: plan.projectId });
      if (origin) payParams.set('origin', origin);
      const checkout = await createCheckout(
        config,
        plan.paddlePriceId,
        paddleCustomerId,
        `${payBase}?${payParams}`,
        { userId, projectId: plan.projectId, planId: plan.id }
      );
      // Subscription row is created by the `subscription.created` webhook (source of truth).
      // transactionId drives Paddle.js overlay checkout on the client.
      return c.json({
        ok: true,
        transactionId: checkout.transactionId,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'createCheckout failed',
          planId: plan.id,
          paddlePriceId: plan.paddlePriceId,
          paddleCustomerId,
          err: msg,
        })
      );
      return c.json(
        {
          ok: false,
          code: 'PADDLE_CHECKOUT_ERROR',
          error: `Checkout failed: ${msg}`,
        },
        502
      );
    }
  }
);

export default app;
