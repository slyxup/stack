import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { plans } from '../lib/schema';
import type { Env } from '../middleware/auth';

// ── Public: list active plans for a project (no auth) ──
const app = new Hono<{ Bindings: Env['Bindings'] }>();

app.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  if (!projectId)
    return c.json({ ok: false, error: 'projectId required' }, 400);

  const db = getDb(c.env);
  const list = await db
    .select()
    .from(plans)
    .where(and(eq(plans.projectId, projectId), eq(plans.isActive, true)))
    .orderBy(asc(plans.sortOrder))
    .all();

  return c.json({
    ok: true,
    plans: list.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      trialDays: p.trialDays > 0 ? p.trialDays : null,
      features: p.features ?? [],
      isPopular: p.isPopular,
    })),
  });
});

export default app;
