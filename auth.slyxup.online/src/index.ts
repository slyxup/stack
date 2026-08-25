import { Hono } from 'hono';
import adminRoute from './routes/admin';
import auth from './routes/auth';
import billingRoute from './routes/billing';
import developersRoute from './routes/developers';
import keysRoute from './routes/keys';
import oauthRoute from './routes/oauth';
import projectsRoute from './routes/projects';
import sessionsRoute from './routes/sessions';
import usersRoute from './routes/users';
import verificationRoute from './routes/verification';
import webhookRoute from './routes/webhooks';

// SlyxUp Auth Worker — CF Workers + D1 + KV
// Deploy: https://auth.slyxup.online (wrangler deploy)
// API: /v1/*  Hosted Pages: /sign-in etc.

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow configured origins + any localhost dev port
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    origin
  );
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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
    service: 'auth.slyxup.online',
    runtime: 'cloudflare',
  })
);
app.get('/v1/health', (c) => c.json({ ok: true, db: !!c.env.DB }));

app.route('/v1/auth', auth);
app.route('/v1/user', usersRoute);
app.route('/v1/verification', verificationRoute);
app.route('/v1/projects', projectsRoute);
app.route('/v1/keys', keysRoute);
app.route('/v1/developers', developersRoute);
app.route('/v1/oauth', oauthRoute);
app.route('/v1/sessions', sessionsRoute);
app.route('/v1/admin', adminRoute);
app.route('/v1/billing', billingRoute);
app.route('/v1/webhooks', webhookRoute);
app.route('/v1', auth); // also mount session at /v1/session

export default {
  fetch(
    request: Request,
    env: Bindings & Record<string, unknown>,
    ctx: ExecutionContext
  ) {
    return app.fetch(request, env, ctx);
  },
};
