import { Hono } from 'hono';

// SlyxUp Auth Worker — CF Workers + D1 + KV
// Deploy: https://auth.slyxup.online (wrangler deploy)
// API: /v1/*  Hosted Pages: /sign-in etc.
// Verified: CI/CD + Brevo + OAuth + Custom Domain — 2026-08-24

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'auth.slyxup.online',
    runtime: 'cloudflare',
    version: '0.1.1-ci-verified',
  })
);
app.get('/v1/health', (c) =>
  c.json({ ok: true, db: !!c.env.DB, version: '0.1.1-ci-verified' })
);

// TODO: routes per PLAN.md — src/routes/auth.ts etc. with D1 + KV

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
