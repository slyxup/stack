import { Hono } from 'hono';

import { count, desc, eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { invoices } from '../lib/schema';
import { isoOrNull } from '../lib/serialize';
import type { Env } from '../middleware/auth';
import { requireUser } from '../middleware/auth';

// ── GET /v1/billing/invoices — current user's invoices (newest first) ──
const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();

app.use('*', requireUser);

app.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  // B12: Pagination — default limit 50, max 100
  const rawLimit = Number(c.req.query('limit') ?? 50);
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
    100
  );
  const rawOffset = Number(c.req.query('offset') ?? 0);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

  const [list, [{ total }]] = await Promise.all([
    db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(invoices)
      .where(eq(invoices.userId, userId)),
  ]);

  return c.json({
    ok: true,
    total,
    limit,
    offset,
    invoices: list.map((i) => ({
      id: i.id,
      amount: i.amount,
      currency: i.currency,
      status: i.status,
      invoiceNumber: i.invoiceNumber,
      billedAt: isoOrNull(i.billedAt),
    })),
  });
});

export default app;
