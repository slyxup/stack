import { zValidator } from '@hono/zod-validator';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { notFound } from '../lib/http';
import { plans } from '../lib/schema';
import type { Env } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { planCreateSchema, planUpdateSchema } from '../schemas/billing';
import { createPaddlePrice, createPaddleProduct } from '../services/paddle.service';
import {
  getPaddleConfig,
  resolveProjectEnvironment,
} from '../services/paddle-config';

// ── /v1/admin/plans — CRUD guarded by BILLING_ADMIN_SECRET bearer token ──
const app = new Hono<{ Bindings: Env['Bindings'] }>();

app.use('*', requireAdmin);

/** GET /v1/admin/plans?projectId= */
app.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  const db = getDb(c.env);
  const list = await db
    .select()
    .from(plans)
    .where(projectId ? eq(plans.projectId, projectId) : undefined)
    .orderBy(asc(plans.sortOrder))
    .all();
  return c.json({ ok: true, plans: list });
});

/** POST /v1/admin/plans — auto-creates product + price in Paddle */
app.post('/', zValidator('json', planCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  let paddlePriceId = body.paddlePriceId;
  const environment = await resolveProjectEnvironment(c.env, body.projectId);
  let paddleTestPriceId = body.paddleTestPriceId;
  let paddleLivePriceId = body.paddleLivePriceId;

  // If no paddlePriceId provided, create product + price in Paddle automatically
  if (!paddlePriceId) {
    try {
      const config = getPaddleConfig(c.env, environment);
      const product = await createPaddleProduct(config, body.name);
      const price = await createPaddlePrice(
        config,
        product.id,
        body.amount,
        body.currency,
        body.interval
      );
      paddlePriceId = price.id;
      if (environment === 'live') paddleLivePriceId = price.id;
      else paddleTestPriceId = price.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[admin] Paddle create failed:', msg);
      return c.json({ ok: false, error: `Paddle error: ${msg}` }, 502);
    }
  }

  const created = await db
    .insert(plans)
    .values({
      ...body,
      paddlePriceId,
      paddleTestPriceId,
      paddleLivePriceId,
    })
    .returning()
    .get();
  return c.json({ ok: true, plan: created }, 201);
});

/** PATCH /v1/admin/plans/:id */
app.patch('/:id', zValidator('json', planUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const db = getDb(c.env);
  const updated = await db
    .update(plans)
    .set(body)
    .where(eq(plans.id, id))
    .returning()
    .get();
  if (!updated) throw notFound('Plan not found');
  return c.json({ ok: true, plan: updated });
});

/** POST /v1/admin/plans/:id/sync — create a Paddle product/price for the
 * project's current test/live mode and store the environment-specific price. */
app.post('/:id/sync', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const plan = await db.select().from(plans).where(eq(plans.id, id)).get();
  if (!plan) throw notFound('Plan not found');
  try {
    const environment = await resolveProjectEnvironment(c.env, plan.projectId);
    const config = getPaddleConfig(c.env, environment);
    const product = await createPaddleProduct(config, plan.name);
    const price = await createPaddlePrice(
      config,
      product.id,
      plan.amount,
      plan.currency,
      plan.interval as 'month' | 'year'
    );
    const updated = await db
      .update(plans)
      .set(
        environment === 'live'
          ? { paddleLivePriceId: price.id, updatedAt: new Date() }
          : { paddleTestPriceId: price.id, updatedAt: new Date() }
      )
      .where(eq(plans.id, id))
      .returning()
      .get();
    return c.json({ ok: true, environment, plan: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Paddle sync failed';
    return c.json({ ok: false, error: message }, 502);
  }
});

/** DELETE /v1/admin/plans/:id — soft delete via isActive=false (keeps FK history) */
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const deactivated = await db
    .update(plans)
    .set({ isActive: false })
    .where(and(eq(plans.id, id), eq(plans.isActive, true)))
    .returning()
    .get();
  if (!deactivated) throw notFound('Plan not found or already inactive');
  return c.json({ ok: true, plan: deactivated });
});

export default app;
