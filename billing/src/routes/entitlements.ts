import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { plans, subscriptions } from '../lib/schema';
import type { Env } from '../middleware/auth';
import { requireUser } from '../middleware/auth';

const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();
app.use('*', requireUser);

// GET /v1/billing/entitlements?projectId= — has(feature) checks
app.get('/', async (c) => {
  const userId = c.get('userId');
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId is required' }, 400);
  const db = getDb(c.env);
  const sub = projectId
    ? await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.projectId, projectId)
          )
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .get()
    : null;
  let plan = null;
  if (sub) {
    plan = await db
      .select()
      .from(plans)
      .where(and(eq(plans.id, sub.planId), eq(plans.projectId, projectId)))
      .get();
  }
  const eligible =
    sub &&
    (sub.status === 'active' || sub.status === 'trialing') &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now();
  const features: string[] = eligible && plan ? plan.features : [];
  c.header('Cache-Control', 'no-store');
  return c.json({
    ok: true,
    planId: plan?.id ?? null,
    status: sub?.status ?? 'none',
    features,
  });
});

export default app;
