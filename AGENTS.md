# AGENTS.md — AI Agent Guide for SlyxUp Stack (CF Workers + D1)

> Read this FIRST before writing any code. This repo is `slyxup.com/stack/` — CF-only, domain-based, drizzle + D1.

## 1. What this project is

SlyxUp Stack — open-source auth platform (github.com/slyxup/stack), domain-based inside `slyxup.com/stack/`:
- `auth/` → Hono Worker + D1 + KV (API `/v1/*`)
- `web/` → Vite + React admin panel and public docs at `stack.slyxup.com`
- `billing/` → Billing Worker + separate D1 and Paddle — sole owner of billing tables; validates auth sessions through read-only auth data. NEVER add billing code/tables to auth.
- `packages/{core,ui}` → SDKs

Root `slyxup.com/` has NO git, NO code — real monorepo is `slyxup.com/stack/`.

---

## 2. Build order — STRICT (do not skip)

AI must build in this order, each phase must pass `pnpm typecheck && pnpm build` before next:

1. **DB Schema** → `auth/src/lib/schema.ts` (D1 correct, see DRIZZLE_GUIDE.md) → `pnpm db:generate` → `pnpm db:migrate:local` + `remote`
2. **API Contract** → `auth/src/routes/` + `schemas/` (Zod) + `services/`
3. **Core SDK** → `packages/core` (client, auth, sessions, users, errors, types)
4. **UI** → `packages/ui` (SignIn/SignUp etc. built on React + Tailwind)
5. **Workers plumbing** → `wrangler.jsonc`, `drizzle.config.ts`, `worker-configuration.d.ts`
6. **Website/Docs** → `web/src/`, public `/docs`, and `INTEGRATION_GUIDE.md`
7. **CI/Release** → `.github/workflows/ci.yml`, `release.yml`

**Don't generate entire repo at once** — finish schema first, test it, then API.

---

## 3. What TO MAKE (V1 scope)

- Email/password: sign-up, sign-in, sign-out, current-user, sessions, refresh
- Email verification, forgot/reset password, change password, update profile, delete account
- OAuth: Google, GitHub only (later: Apple etc.)
- Sessions: DB-backed, HttpOnly Secure SameSite cookies, `crypto.randomUUID()`, `crypto.getRandomValues()`
- Keys: `pk_` and `sk_`; the project `test/live` environment controls behavior
- Projects + project_members (see PLAN.md §8)
- Drizzle schema + migrations (D1 SQLite)
- Workers best practices: `env.DB/KV`, `ctx.waitUntil`, streaming, no global state, floating promises

## 4. What NOT to make (V1)

DO NOT build — will explode scope:

- Organizations / SAML / SCIM (billing is its own Worker; never merge billing INTO auth)
- Teams / Analytics / Passkeys / Mobile/Vue/Svelte SDKs
- 10+ OAuth providers, multi-region, complex admin panel

If AI tries to add these, stop and ask.

---

## 5. Tech stack — CF ONLY (no Postgres/Docker)

- **Runtime**: Cloudflare Workers (`wrangler dev`/`deploy`, `wrangler.jsonc`, `compatibility_date`, `nodejs_compat`)
- **DB**: D1 (SQLite) — see TECH_STACK.md for limits
- **ORM**: Drizzle `sqlite-core` + `d1-http` — see DRIZZLE_GUIDE.md
- **Validation**: Zod
- **Password**: PBKDF2-HMAC-SHA-256 with a per-user salt
- **Logging**: `observability` in wrangler.jsonc + structured JSON
- **Testing**: Vitest + `wrangler dev` local D1

**Never use**: `postgres` driver, `docker-compose.yml`, `pgTable`, `Math.random()` for tokens, hardcoded secrets.

---

## 6. D1 Drizzle rules (CRITICAL)

- Boolean → `integer({ mode: 'boolean' })` (D1 has no BOOL)
- Timestamp → `integer({ mode: 'timestamp' })` (unix seconds)
- JSON → `text({ mode: 'json' }).$type<T>()`
- ID → `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
- FK always enforced → `onDelete: 'cascade'` explicitly
- Batch inserts → max 100 bound params: `BATCH_SIZE = floor(100 / cols)`
- Index: `uniqueIndex`, `index`
- After ANY schema change: `pnpm db:generate` → `pnpm db:migrate:local` → `pnpm db:migrate:remote` → test on BOTH

Read `DRIZZLE_GUIDE.md` before editing schema.

---

## 7. Env management — dev/prod parity

- **Vars** (non-secret): `wrangler.jsonc` `vars` — `APP_URL`, `CORS_ORIGINS` — same in dev/prod
- **Secrets**: `wrangler secret put SESSION_SECRET` — NEVER in `wrangler.jsonc` or `.env`
- **Local dev**: `auth/.dev.vars` and `billing/.dev.vars` (gitignored)
- **D1/KV IDs**: `REPLACE_WITH_*_ID` placeholders → replace via `wrangler d1 create` output
- No `.env` in Workers — use `.dev.vars` + secrets

See `ENV_GUIDE.md`.

---

## 8. Workers best practices (MUST follow)

- Access bindings via `env.DB` / `env.KV` param — never global
- `export default { fetch(req, env, ctx) }` — return `Response`
- `crypto.randomUUID()` / `crypto.getRandomValues()` — never `Math.random()`
- `env.DB.prepare(sql).bind(...).all()` — always bind params (prevent injection)
- `ctx.waitUntil()` for post-response work — don't destructure `ctx`
- Stream large payloads — no `await res.text()` on unbounded
- No module-level mutable request state
- `wrangler types` generates `Env` — never hand-write
- `wrangler.jsonc` not `toml` for new projects
- Timing-safe compare: `crypto.subtle.timingSafeEqual` for secrets

Full rules: see `references/rules.md` (workers-best-practices skill).

---

## 9. Conventions

- Domain folder names are runtime packages (`auth`, `billing`, `web`); deployment URLs live in each active Wrangler config.
- Dependency: `@slyxup/ui → @slyxup/core` (never reverse)
- API versioned `/v1/` from day one
- The deployed web app provides `/admin` and public `/docs`; it is not a marketing-only site.
- **README sync rule**: ANY edit to a package's public surface (`packages/*/src`) — new/renamed/removed exports, methods, props, commands, or behavior — MUST update that package's `README.md` in the SAME change. No shipping SDK changes with stale docs.

---

## 10. How to work (AI workflow)

1. Read `TECH_STACK.md`, `DRIZZLE_GUIDE.md`, `ENV_GUIDE.md` before coding
2. Check existing `src/lib/schema.ts` before adding tables
3. Run `pnpm typecheck` after each file, `pnpm build` after each phase
4. Use `wrangler dev` to test locally with D1 (`--local`)
5. Generate migrations immediately after schema edit — commit both schema + migration sql
6. Changed a package's public surface (`packages/*/src`)? Update that package's `README.md` in the same commit
7. Ask if scope unclear — don't invent Dashboard/Billing logic in V1

---

## 11. File map for AI

- `PLAN.md` → full product spec (1507 lines, already CF-updated)
- `TECH_STACK.md` → stack + limitations (100 params, BOOLEAN etc.)
- `DRIZZLE_GUIDE.md` → generate/migrate workflow, D1 specifics
- `ENV_GUIDE.md` → dev/prod parity, wrangler secrets
- `STRUCTURE.md` → deploy mapping + tree
- `LIMITATIONS.md` → what AI must not do
- `auth/wrangler.com-workers-dev.jsonc` → active Auth Worker config
- `billing/wrangler.com-workers-dev.jsonc` → active Billing Worker config

**Start with DB schema — that's the foundation.**
