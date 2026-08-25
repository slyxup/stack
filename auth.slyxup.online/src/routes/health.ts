import { Hono } from 'hono';

const health = new Hono<{ Bindings: { DB: D1Database } }>();

health.get('/', (c) =>
  c.json({ ok: true, service: 'auth.slyxup.online', runtime: 'cloudflare' })
);
health.get('/health', (c) =>
  c.json({ ok: true, service: 'auth.slyxup.online', runtime: 'cloudflare' })
);

export default health;
