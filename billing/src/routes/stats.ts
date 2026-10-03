import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { invoices, plans, subscriptions } from '../lib/schema';
import type { Env } from '../middleware/auth';
import { requireUser } from '../middleware/auth';

// ── GET /v1/billing/stats?projectId= — project aggregates for the dashboard ──
// Same access model as invoices/subscription: any signed-in user. Aggregates
// are computed from this worker's own D1 (plans/subscriptions/invoices).
const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();

app.use('*', requireUser);

app.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);
  const db = getDb(c.env);

  const [subs, invs, planRows] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(eq(subscriptions.projectId, projectId))
      .all(),
    db
      .select({
        amount: invoices.amount,
        currency: invoices.currency,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .all(),
    db
      .select({
        id: plans.id,
        name: plans.name,
        amount: plans.amount,
        currency: plans.currency,
        interval: plans.interval,
        isActive: plans.isActive,
      })
      .from(plans)
      .where(eq(plans.projectId, projectId))
      .all(),
  ]);

  const byStatus: Record<string, number> = {
    active: 0,
    trialing: 0,
    past_due: 0,
    paused: 0,
    canceled: 0,
  };
  for (const s of subs) {
    if (s.status in byStatus) byStatus[s.status] += 1;
    else byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  const paying = (byStatus.active ?? 0) + (byStatus.trialing ?? 0);

  const planById = new Map(planRows.map((p) => [p.id, p]));
  const subsByPlan = new Map<string, number>();
  const mrrByCurrency: Record<string, number> = {};
  for (const s of subs) {
    if (s.status !== 'active' && s.status !== 'trialing') continue;
    subsByPlan.set(s.planId, (subsByPlan.get(s.planId) ?? 0) + 1);
    const plan = planById.get(s.planId);
    if (!plan) continue;
    const monthly =
      plan.interval === 'year' ? Math.round(plan.amount / 12) : plan.amount;
    const cur = plan.currency || 'USD';
    mrrByCurrency[cur] = (mrrByCurrency[cur] ?? 0) + monthly;
  }

  const revenueByCurrency: Record<string, number> = {};
  let paidCount = 0;
  for (const inv of invs) {
    if (inv.status !== 'paid') continue;
    paidCount += 1;
    const cur = inv.currency || 'USD';
    revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + inv.amount;
  }

  return c.json({
    ok: true,
    stats: {
      subscribers: { ...byStatus, total: subs.length, paying },
      revenue: {
        byCurrency: revenueByCurrency,
        paidCount,
        invoiceCount: invs.length,
      },
      mrr: { byCurrency: mrrByCurrency },
      plans: planRows.map((p) => ({
        planId: p.id,
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        interval: p.interval,
        isActive: p.isActive,
        subscribers: subsByPlan.get(p.id) ?? 0,
      })),
    },
  });
});

export default app;
