import { and, desc, eq, ne } from 'drizzle-orm';
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
  const db = getDb(c.env);
  const sub = projectId
    ? await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.projectId, projectId),
            ne(subscriptions.status, 'canceled')
          )
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .get()
    : null;
  let plan = null;
  if (sub) {
    plan = await db.select().from(plans).where(eq(plans.id, sub.planId)).get();
  }
  const features: string[] = plan ? ((plan.features as string[]) ?? []) : [];
  const has = (f: string) => features.includes(f);
  return c.json({
    ok: true,
    planId: plan?.id ?? null,
    status: sub?.status ?? 'none',
    features,
    has,
  });
});

export default app;
