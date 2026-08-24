import { Hono } from 'hono';

// SlyxUp Auth Worker — CF Workers + D1 + KV
// Deploy: https://auth.slyxup.online (wrangler deploy)
// API: /v1/*  Hosted Pages: /sign-in etc.
// Verified: CI/CD + Brevo + OAuth + Custom Domain + Pages — 2026-08-24 14:55

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  c.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie'
  );
  if (c.req.method === 'OPTIONS') return new Response('', { status: 204 });
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'auth.slyxup.online',
    runtime: 'cloudflare',
    version: '0.1.2-ci-verified',
  })
);
app.get('/v1/health', (c) =>
  c.json({ ok: true, db: !!c.env.DB, version: '0.1.2-ci-verified' })
);

import auth from './routes/auth';
import developersRoute from './routes/developers';
import keysRoute from './routes/keys';
import projectsRoute from './routes/projects';
import usersRoute from './routes/users';
import verificationRoute from './routes/verification';
app.route('/v1/auth', auth);
app.route('/v1/user', usersRoute);
app.route('/v1/verification', verificationRoute);
app.route('/v1/projects', projectsRoute);
app.route('/v1/keys', keysRoute);
app.route('/v1/developers', developersRoute);
app.route('/v1', auth); // also mount session at /v1/session

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
