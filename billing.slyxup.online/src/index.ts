import { Hono } from 'hono';
type Bindings = { DB: D1Database; KV: KVNamespace };
const app = new Hono<{ Bindings: Bindings }>();
app.get('/health', (c) => c.json({ ok: true, service: 'billing.slyxup.online', runtime: 'cloudflare', status: 'placeholder' }));
export default { fetch(req: Request, env: Bindings, ctx: ExecutionContext) { return app.fetch(req, env, ctx); } };
