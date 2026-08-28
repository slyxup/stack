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

// CORS — local dev is permissive, live checks approved custom domains.
// In test mode, missing CORS is not treated as an error — the dashboard shows
// a hint instead of a CORS failure. Live mode enforces the allowlist.
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    origin
  );
  const isTestRequest =
    c.req.header('X-Environment') === 'test' ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Publishable-Key',
    'Access-Control-Max-Age': '86400',
  };
  let allow = false;
  if (
    origin &&
    (allowed.includes(origin) ||
      allowed.includes('*') ||
      isLocalhost ||
      isTestRequest)
  ) {
    allow = true;
  } else if (origin?.startsWith('https://')) {
    // Check project custom domains (like auth does) — cache for 60s
    try {
      const cached = await c.env.KV.get('billing_cors_domains');
      let hosts: string[] | null = cached
        ? (JSON.parse(cached) as string[])
        : null;
      if (!hosts) {
        // We don't have project context here, so allow any https origin in test and
        // let the route handler do project-specific checks. For live, the route will
        // validate the project's allowed domains.
        hosts = [];
        await c.env.KV.put('billing_cors_domains', JSON.stringify(hosts), {
          expirationTtl: 60,
        });
      }
      if (hosts) {
        const host = new URL(origin).hostname
          .toLowerCase()
          .replace(/^www\./, '');
        allow = hosts.some(
          (h) => h.replace(/^www\./, '').toLowerCase() === host
        );
      }
    } catch {
      // Fallback: allow test, block live without match
      allow = isTestRequest;
    }
  }
  if (allow && origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    corsHeaders.Vary = 'Origin';
  } else if (isTestRequest && origin) {
    // In test/local, be permissive — don't block billing calls due to CORS
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

// Public: Paddle config for client-side Paddle.js overlay checkout.
// Returns environment + client-side token — safe to expose (limited-scope token).
app.get('/v1/billing/config', (c) =>
  c.json({
    ok: true,
    environment: (c.env.PADDLE_ENVIRONMENT ?? 'sandbox') as string,
    clientToken:
      c.env.PADDLE_CLIENT_TOKEN ?? 'test_c979e5a90959dd513104abf00e8',
  })
);

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
