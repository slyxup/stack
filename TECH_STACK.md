# TECH_STACK.md — Cloudflare Only (Workers + D1 + KV + R2)

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Cloudflare Workers (`wrangler dev`/`deploy`) | Edge, zero cold start, D1/KV native |
| Framework | Hono (`fetch` handler) | Light, Workers-compatible, Zod |
| Lang | TypeScript | `strict: true`, `moduleResolution: bundler` |
| DB | Cloudflare D1 (SQLite) | `sqlite-core`, `d1-http`, single-threaded |
| ORM | Drizzle ORM `drizzle-orm/d1` | `drizzle-kit generate`, `wrangler d1 migrations apply` |
| Validation | Zod | `zod` + `drizzle-zod` (if needed) |
| Password | Argon2id (Workers-compatible via `oslo`/`@noble/hashes`) | Never plain text, use WebCrypto where possible |
| Sessions | D1 + KV + HttpOnly Secure SameSite cookies | `crypto.randomUUID()` |
| Logging | `observability` in `wrangler.jsonc` + Pino JSON | `head_sampling_rate: 1` |
| Testing | Vitest + `wrangler dev --local` D1 | No Jest globals |
| Package | pnpm + turbo | `pnpm-workspace.yaml`, `turbo.json` |

**Never use**: `postgres`/`pgTable`/`neon`/`supabase`, `docker-compose.yml`, `prisma`, `Math.random()`.

---

## D1 Limitations (CRITICAL for AI)

| Feature | Postgres | D1 (SQLite) | What AI must do |
|---------|----------|-------------|-----------------|
| Boolean | `boolean` | **No** — use `integer({ mode: 'boolean' })` | `integer('is_verified', {mode:'boolean'})` |
| Datetime | `timestamp` | **No** — use `integer({ mode: 'timestamp' })` | `integer('created_at', {mode:'timestamp'})` + `$defaultFn(()=>new Date())` |
| JSON | `jsonb` | `text({ mode: 'json' }).$type<T>()` | `text('prefs', {mode:'json'}).$type<Prefs>()` |
| FK | OFF default | **Always ON** | Always set `onDelete: 'cascade'` explicitly |
| Bound params | ~999 | **100 max** | Batch: `floor(100 / cols)` |
| Concurrency | Multi-writer | **Single-threaded** | No parallel `db.batch` without await, use transactions |
| Enum | `pgEnum` | `text({ enum: ['a','b'] })` | Validate via Zod too |
| UUID | `gen_random_uuid()` | `crypto.randomUUID()` in `$defaultFn` | `text('id').$defaultFn(()=>crypto.randomUUID())` |
| JSON queries | `->>` | `json_extract(col, '$.path')` | Use Drizzle `sql` helper |

---

## Workers Best Practices (enforced)

- `compatibility_date`: `"2025-08-24"` + `compatibility_flags: ["nodejs_compat"]` (required for Hono/node compat)
- `wrangler.jsonc` (not `toml`) — bindings: `d1_databases`, `kv_namespaces`, `r2_buckets`, `vars`, `routes`, `observability`
- `wrangler types` → `worker-configuration.d.ts` — never hand-write `Env`
- Bindings via `env.DB` param — `export default { fetch(req, env, ctx) }` — never global
- `crypto.randomUUID()` / `crypto.getRandomValues()` for tokens — never `Math.random()`
- `env.DB.prepare(sql).bind(...).all()/get()/run()` — always bind params
- `ctx.waitUntil(promise)` for background — don't destructure `ctx`
- Stream: `new Response(stream)` — never `await req.text()` on unbounded
- No `any` on `Env`, no `as unknown as T`, no `implements DurableObject` (use `extends`)
- `crypto.subtle.timingSafeEqual` for secret compare
- `npm i -g pnpm` + `turbo` — `pnpm --filter auth.slyxup.online dev` → `wrangler dev`

---

## Config per domain

### `auth.slyxup.online/wrangler.jsonc`
```jsonc
{
  "name": "auth-slyxup-online",
  "main": "src/index.ts",
  "compatibility_date": "2025-08-24",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },
  "vars": { "APP_URL": "https://stack.slyxup.online", "CORS_ORIGINS": "https://stack.slyxup.online" },
  "d1_databases": [{ "binding": "DB", "database_name": "slyxup_auth", "database_id": "REPLACE", "migrations_dir": "migrations" }],
  "kv_namespaces": [{ "binding": "KV", "id": "REPLACE" }],
  "r2_buckets": [{ "binding": "STORAGE", "bucket_name": "slyxup-storage" }],
  "routes": [{ "pattern": "auth.slyxup.online/*", "zone_name": "slyxup.online" }]
}
```

### `stack.slyxup.online/wrangler.jsonc` (Pages)
```jsonc
{ "name": "stack-slyxup-online", "assets": { "directory": ".next" }, "routes": [{ "pattern": "stack.slyxup.online/*" }] }
```

Secrets: `wrangler secret put SESSION_SECRET` — never in `wrangler.jsonc`.

---

## Runtime shapes

```ts
// auth.slyxup.online/src/index.ts
import { Hono } from 'hono';
type Bindings = { DB: D1Database; KV: KVNamespace; STORAGE: R2Bucket; SESSION_SECRET: string };
const app = new Hono<{ Bindings: Bindings }>();
app.get('/v1/health', (c) => c.json({ ok: true }));
export default { fetch(req: Request, env: Bindings, ctx: ExecutionContext) { return app.fetch(req, env, ctx); } };
```

```ts
// drizzle usage in Worker
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './lib/schema';
export async function handle(req: Request, env: Bindings) {
  const db = drizzle(env.DB, { schema });
  const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).get();
}
```

---

## Package scripts (CF)

```json
{
  "dev": "wrangler dev",
  "deploy": "wrangler deploy",
  "typegen": "wrangler types",
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply slyxup_auth --local",
  "db:migrate:remote": "wrangler d1 migrations apply slyxup_auth --remote"
}
```

Root: `pnpm db:generate && pnpm --filter auth.slyxup.online db:migrate:local && db:migrate:remote`

---

## What NOT to do

- ❌ `import { pgTable }` — use `sqliteTable`
- ❌ `docker-compose up` — use `wrangler dev`
- ❌ `process.env.DATABASE_URL` in Worker — use `env.DB`
- ❌ `Math.random()` / hardcoded secrets / `wrangler.toml`
