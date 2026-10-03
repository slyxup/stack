import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ApiError } from './lib/http';
import type { Env } from './middleware/auth';
import adminRoute from './routes/admin';
import checkoutRoute from './routes/checkout';
import entitlementsRoute from './routes/entitlements';
import invoicesRoute from './routes/invoices';
import plansRoute from './routes/plans';
import refundsRoute, { adminRefunds } from './routes/refunds';
import statsRoute from './routes/stats';
import subscriptionRoute from './routes/subscription';
import transactionsRoute from './routes/transactions';
import webhookRoute from './routes/webhooks';
import {
  getDefaultBillingEnvironment,
  getPaddleClientToken,
  getPaddleConfig,
  resolveProjectEnvironment,
} from './services/paddle-config';
import { checkoutIntents } from './lib/schema';
import { getDb } from './lib/db';
import { csrfMiddleware } from './middleware/csrf';
import { eq } from 'drizzle-orm';

// SlyxUp Billing Worker — CF Workers + D1 + Paddle
// Deploy: `wrangler deploy` (URL comes from your Cloudflare account)
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
  const isTestRequest = isLocalhost;
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Publishable-Key, X-Secret-Key, X-CSRF-Token',
    // Browser JS must be able to read the CSRF token header.
    'Access-Control-Expose-Headers': 'X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };
  let allow = false;
  // Pages previews + product subdomains — always safe for CORS
  if (origin.endsWith('.pages.dev') || origin.endsWith('.slyxup.com')) allow = true;
  if (
    !allow &&
    origin &&
    (allowed.includes(origin) ||
      origin === new URL(c.req.url).origin ||
      isLocalhost ||
      isTestRequest)
  ) {
    allow = true;
  } else if (!allow && origin?.startsWith('https://')) {
    // Check project custom domains (like auth does) — cache for 60s
    try {
      const cached = await c.env.KV.get('billing_cors_domains');
      let hosts: string[] | null = cached
        ? (JSON.parse(cached) as string[])
        : null;
      if (!hosts) {
        if (c.env.AUTH_DB) {
          const result = await c.env.AUTH_DB.prepare(
            "SELECT pd.domain FROM project_domains pd JOIN projects p ON p.id = pd.project_id WHERE p.environment = 'live'"
          ).all<{ domain: string }>();
          hosts = result.results.map((row) => row.domain.toLowerCase());
        } else {
          hosts = [];
        }
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
  if (origin && !allow && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return c.json({ ok: false, error: 'Origin is not allowed' }, 403);
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.res.headers.set(k, v);
});

// CSRF protection on mutation routes (webhooks exempt — HMAC-signed).
app.use('/v1/*', csrfMiddleware);

// Per-endpoint rate limiting (Day 3). Route-level limiters in
// routes/{checkout,refunds,transactions}.ts stay authoritative for their
// strict budgets; this is a global backstop with billing-specific budgets.
app.use('/v1/*', async (c, next) => {
  // Webhooks are signature-validated and high-volume — skip global limiter.
  if (new URL(c.req.url).pathname.startsWith('/v1/webhooks/')) {
    await next();
    return;
  }
  const { checkBillingRateLimit, resolveBillingEndpoint } = await import(
    './lib/rate-limit'
  );
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For') ??
    'unknown';
  const endpoint = resolveBillingEndpoint(c.req.method, c.req.path);
  const rl = await checkBillingRateLimit(c.env.KV, endpoint, ip);
  if (!rl.allowed) {
    return c.json(
      { ok: false, error: 'TOO_MANY_REQUESTS' },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    );
  }
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'billing',
    runtime: 'cloudflare',
  })
);
app.get('/v1/health', (c) =>
  c.json({
    ok: true,
    db: !!c.env.DB,
    authDb: !!c.env.AUTH_DB,
    authUrl: c.env.AUTH_URL,
  })
);

// Paddle checkout redirect lands here — VERIFY with Paddle first.
// Completed → forward to the web success page. Anything else → send the
// buyer to /pay to actually complete payment (never celebrate unpaid).
app.get('/', async (c) => {
  const url = new URL(c.req.url);
  const txnId =
    url.searchParams.get('_ptxn') ?? url.searchParams.get('transaction_id');
  const projectId = url.searchParams.get('project_id');
  const origin = url.searchParams.get('origin');
  const base = c.env.APP_URL ?? 'https://stack.slyxup.com';
  if (txnId) {
    const paid = await isTransactionCompleted(c.env, txnId);
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (origin) params.set('origin', origin);
    if (paid) {
      params.set('transaction_id', txnId);
      return c.redirect(`${base}/checkout/success?${params}`, 302);
    }
    // Not paid (or lookup failed) → resume payment instead of fake success.
    params.set('_ptxn', txnId);
    return c.redirect(`${new URL(c.req.url).origin}/pay?${params}`, 302);
  }
  return c.redirect(base, 302);
});

// Real payment-link page — hosts Paddle.js and opens the checkout overlay
// for ?_ptxn=. This is what Paddle must use as `checkout.url` when creating
// transactions; a page without Paddle.js here strands buyers with no way to pay.
app.get('/pay', (c) => {
  const url = new URL(c.req.url);
  const rawTxn = url.searchParams.get('_ptxn') ?? '';
  const rawProject = url.searchParams.get('project_id') ?? '';
  const rawOrigin = url.searchParams.get('origin') ?? '';

  const txnId = /^txn_[A-Za-z0-9]+$/.test(rawTxn) ? rawTxn : '';
  const projectId = /^[\w-]{1,80}$/.test(rawProject) ? rawProject : '';
  let origin = '';
  try {
    const u = new URL(rawOrigin);
    if (u.protocol === 'https:' || u.protocol === 'http:')
      origin = u.toString();
  } catch {
    origin = '';
  }

  const successParams = new URLSearchParams();
  if (projectId) successParams.set('project_id', projectId);
  if (origin) successParams.set('origin', origin);
  if (txnId) successParams.set('transaction_id', txnId);
   const successBase =
     c.env.PAYMENT_SUCCESS_URL ?? `${new URL(c.req.url).origin}/`;
   const successUrl = `${successBase}${successBase.includes('?') ? '&' : '?'}${successParams}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Complete your payment — SlyxUp</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fafbfc; color: #111; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  .card { text-align: center; max-width: 420px; padding: 32px; }
  .spin { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #e4e4e7; border-top-color: #09090b; margin: 0 auto 16px; animation: s 0.8s linear infinite; }
  @keyframes s { to { transform: rotate(360deg); } }
  .btn { display: inline-block; margin-top: 16px; padding: 10px 20px; border-radius: 10px; background: #09090b; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border: 0; cursor: pointer; }
  .muted { color: #71717a; font-size: 13px; margin-top: 12px; }
  .err { color: #b91c1c; font-size: 14px; }
</style>
</head>
<body>
<div class="card" id="root">
  <div class="spin"></div>
  <div id="msg">Loading secure checkout…</div>
  <div id="actions"></div>
</div>
<script>
(function () {
  var TXN = ${JSON.stringify(txnId)};
  var PROJECT = ${JSON.stringify(projectId)};
  var SUCCESS = ${JSON.stringify(successUrl)};
  var msg = document.getElementById('msg');
  var actions = document.getElementById('actions');
  function setStatus(text) {
    msg.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'muted';
    p.textContent = text;
    msg.appendChild(p);
  }
  function fail(text) {
    msg.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'err';
    p.textContent = text;
    msg.appendChild(p);
    actions.innerHTML = '';
    var b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Try again';
    b.onclick = function () { actions.innerHTML = ''; start(); };
    actions.appendChild(b);
  }
  function loadPaddleJs(done, onerr) {
    if (window.Paddle) { done(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.async = true;
    s.onload = done;
    s.onerror = onerr;
    document.head.appendChild(s);
  }
  function start() {
    if (!TXN) { fail('This payment link is missing its transaction reference.'); return; }
    setStatus('Loading secure checkout…');
    loadPaddleJs(
      function () {
        setStatus('Contacting billing server…');
        fetch('/v1/billing/config?projectId=' + encodeURIComponent(PROJECT), { headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('config http ' + r.status);
            return r.json();
          })
          .then(function (cfg) {
            if (!cfg || !cfg.clientToken) throw new Error('config payload');
            try {
              // Paddle.js defaults to PRODUCTION and never auto-detects from
              // the token — a test_ token sent to prod hosts gets
              // invalid_client_token. Set env explicitly BEFORE Initialize.
              window.Paddle.Environment.set(cfg.environment === 'production' ? 'production' : 'sandbox');
               window.Paddle.Initialize({
                 token: cfg.clientToken,
                 eventCallback: function (data) {
                   if (data && data.name === 'checkout.completed') {
                     window.location.assign(SUCCESS);
                   }
                 }
               });
            } catch (e) {
              throw new Error('init: ' + (e && e.message ? e.message : e));
            }
            if (window.Paddle.Checkout && window.Paddle.Checkout.on) {
              window.Paddle.Checkout.on('checkout.completed', function () { window.location.assign(SUCCESS); });
            }
            setStatus('Opening checkout…');
            try {
              window.Paddle.Checkout.open({ transactionId: TXN, settings: { displayMode: 'overlay', successUrl: SUCCESS } });
              setStatus('If the checkout window did not open, disable your ad-blocker for this page and try again.');
            } catch (e) {
              throw new Error('open: ' + (e && e.message ? e.message : e));
            }
          })
          .catch(function (e) {
            var detail = e && e.message ? e.message : String(e);
            fail('Payment setup failed (' + detail + '). Check your connection or disable ad-blockers, then retry.');
          });
      },
      function () {
        fail('Could not download the payment provider (cdn.paddle.com blocked). Disable your ad-blocker / VPN for this page, then retry.');
      }
    );
  }
  start();
})();
</script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

/** Server-side truth: is this Paddle transaction actually paid? */
async function isTransactionCompleted(
  env: Env['Bindings'],
  txnId: string
): Promise<boolean> {
  try {
    if (!/^txn_[A-Za-z0-9]+$/.test(txnId)) return false;
    const intent = await getDb(env)
      .select({ projectId: checkoutIntents.projectId })
      .from(checkoutIntents)
      .where(eq(checkoutIntents.paddleTransactionId, txnId))
      .get();
    if (!intent) return false;
    const config = getPaddleConfig(
      env,
      await resolveProjectEnvironment(env, intent.projectId)
    );
    const base =
      config.environment === 'production'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com';
    const res = await fetch(
      `${base}/transactions/${encodeURIComponent(txnId)}`,
      { headers: { Authorization: `Bearer ${config.apiKey}` } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { data?: { status?: string } };
    return data?.data?.status === 'completed';
  } catch {
    return false;
  }
}

app.route('/v1/admin/plans', adminRoute);
app.route('/v1/admin/refunds', adminRefunds);
app.route('/v1/billing/plans', plansRoute);
app.route('/v1/billing/checkout', checkoutRoute);
app.route('/v1/billing/subscription', subscriptionRoute);
app.route('/v1/billing/stats', statsRoute);
app.route('/v1/billing/transactions', transactionsRoute);
app.route('/v1/billing/entitlements', entitlementsRoute);
app.route('/v1/billing/invoices', invoicesRoute);
app.route('/v1/billing/refunds', refundsRoute);
app.route('/v1/webhooks', webhookRoute);

// Public: Paddle config for client-side Paddle.js overlay checkout.
// Returns environment + client-side token — safe to expose (limited-scope token).
// Fails LOUDLY when the secret is missing — never fall back to a hardcoded
// token (a stale one caused cryptic `invalid_client_token` failures).
app.get('/v1/billing/config', (c) => {
  const projectId = c.req.query('projectId');
  const environmentPromise = projectId
    ? resolveProjectEnvironment(c.env, projectId)
    : Promise.resolve(getDefaultBillingEnvironment(c.env));
  return environmentPromise.then((environment) => {
    const token = getPaddleClientToken(c.env, environment);
    if (!token)
      return c.json(
        {
          ok: false,
          error: `Paddle ${environment === 'live' ? 'production' : 'sandbox'} client token not configured`,
        },
        503
      );
    return c.json({
      ok: true,
      environment: environment === 'live' ? 'production' : 'sandbox',
      clientToken: token,
    });
  });
});

app.notFound((c) => c.json({ ok: false, error: 'Not Found' }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { ok: false, error: err.message },
      err.status as ContentfulStatusCode
    );
  }
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'unhandled error',
      path: c.req.path,
      err: errMsg,
      stack: err instanceof Error ? err.stack : undefined,
    })
  );
  return c.json(
    { ok: false, error: 'Internal Server Error', detail: errMsg },
    500
  );
});

export default {
  fetch(request: Request, env: Env['Bindings'], ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
