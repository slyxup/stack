import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ApiError } from './lib/http';
import type { Env } from './middleware/auth';
import adminRoute from './routes/admin';
import checkoutRoute from './routes/checkout';
import invoicesRoute from './routes/invoices';
import plansRoute from './routes/plans';
import subscriptionRoute from './routes/subscription';
import webhookRoute from './routes/webhooks';

// SlyxUp Billing Worker — CF Workers + D1 + Paddle
// Deploy: https://billing.slyxup.online (wrangler deploy)
// API: /v1/*  Webhooks: /v1/webhooks/*  Health: /health

const app = new Hono<{ Bindings: Env['Bindings'] }>();

// CORS — configured origins + localhost dev ports; credentials for session cookies
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    origin
  );
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Max-Age': '86400',
  };
  if (
    origin &&
    (allowed.includes(origin) || allowed.includes('*') || isLocalhost)
  ) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    corsHeaders.Vary = 'Origin';
  }
  if (c.req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'billing.slyxup.online',
    runtime: 'cloudflare',
  })
);
app.get('/v1/health', (c) =>
  c.json({ ok: true, db: !!c.env.DB, authDb: !!c.env.AUTH_DB })
);

app.route('/v1/admin/plans', adminRoute);
app.route('/v1/billing/plans', plansRoute);
app.route('/v1/billing/checkout', checkoutRoute);
app.route('/v1/billing/subscription', subscriptionRoute);
app.route('/v1/billing/invoices', invoicesRoute);
app.route('/v1/webhooks', webhookRoute);

app.notFound((c) => c.json({ ok: false, error: 'Not Found' }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { ok: false, error: err.message },
      err.status as ContentfulStatusCode
    );
  }
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'unhandled error',
      path: c.req.path,
      err: err instanceof Error ? err.message : String(err),
    })
  );
  return c.json({ ok: false, error: 'Internal Server Error' }, 500);
});

export default {
  fetch(request: Request, env: Env['Bindings'], ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
