import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { notConfigured } from '../lib/http';
import { checkRateLimit } from '../lib/rate-limit';
import type { Env } from '../middleware/auth';
import { getTransaction } from '../services/paddle.service';

// ── GET /v1/billing/transactions/:id — verify a checkout transaction ──
// Source of truth for "did this buyer actually pay?". The success page and
// the billing GET / redirect MUST consult this before celebrating.
//
// Public + rate-limited by design: the `txn_` id is an unguessable capability
// token (same model as Paddle's own ?_ptxn= payment links), and the response
// carries no customer/email/amount data — only paid/not-paid + resume URL.
// Auth-gating would break verification for buyers coming from external
// platforms, who hold no session on the success-page domain.

const app = new Hono<{
  Bindings: Env['Bindings'];
  Variables: Env['Variables'];
}>();

const rateLimit = createMiddleware<Env>(async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const rl = await checkRateLimit(c.env.KV, `txn-verify:${ip}`, 30, 60);
  if (!rl.allowed)
    return c.json({ ok: false, error: 'Too many requests' }, 429, {
      'Retry-After': String(rl.resetIn),
    });
  await next();
});

app.get('/:id', rateLimit, async (c) => {
  const apiKey = c.env.PADDLE_API_KEY;
  if (!apiKey) throw notConfigured();

  const id = c.req.param('id');
  if (!id || !/^txn_[A-Za-z0-9]+$/.test(id)) {
    return c.json({ ok: false, error: 'Invalid transaction id' }, 400);
  }

  const config = {
    apiKey,
    environment: (c.env.PADDLE_ENVIRONMENT === 'production'
      ? 'production'
      : 'sandbox') as 'sandbox' | 'production',
  };

  try {
    const tx = await getTransaction(config, id);
    const status = tx.status ?? 'unknown';
    return c.json({
      ok: true,
      id: tx.id,
      status,
      paid: status === 'completed',
      // Resume URL when unpaid (our /pay page), null when paid/unknown.
      checkoutUrl: status === 'completed' ? null : (tx.checkout?.url ?? null),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'transaction_lookup_failed',
        transactionId: id,
        err: msg,
      })
    );
    return c.json({ ok: false, error: 'Transaction not found' }, 404);
  }
});

export default app;
