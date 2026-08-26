import { Hono } from 'hono';

import { desc, eq } from 'drizzle-orm';
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
  const list = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt))
    .limit(100);

  return c.json({
    ok: true,
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
