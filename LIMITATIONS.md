# LIMITATIONS.md — What AI Must NOT Do / CF Constraints

## 1. V1 NOT to build (from PLAN.md §30)

- Dashboard, Organizations, SAML/SCIM, Enterprise SSO
- Billing Teams, Analytics, Storage, AI (auth stays identity-only)
- **NEVER add billing tables/routes to `slyxup_auth` or the auth Worker** — billing.slyxup.online is the sole billing owner (its own D1 + Paddle webhooks). Auth ↔ billing integration happens only via billing's read-only `AUTH_DB` session check.
- Passkeys, Mobile SDK, Vue/Svelte SDK, React Native
- Multi-region, complex admin panel

If AI adds these, it’s out of scope — stop.

## 2. D1 Hard limits (AI must respect)

- **100 bound params** per query — bulk inserts must batch: `BATCH = floor(100 / cols)`
- **No BOOLEAN** — `integer({mode:'boolean'})` only
- **No DATETIME** — `integer({mode:'timestamp'})` only
- **FK always ON** — must set `onDelete` explicitly, no `DEFERRABLE`
- **Single writer** — no concurrent `db.insert` without `await` — use `await`/`ctx.waitUntil`
- **JSON via TEXT** — `text({mode:'json'}).$type<T>()`, query via `json_extract`
- **D1 size**: 10GB per DB, per-query 100ms CPU, 1MB row — keep sessions small, R2 for large

## 3. Workers hard limits

- **128MB memory** — stream large payloads, no `await res.text()` on unbounded
- **CPU 50ms (free) / 30s (paid)** — no heavy Argon2 sync, use `ctx.waitUntil` for non-critical
- **No `fs`, no `child_process`** — Workers sandbox
- **Routes must have `zone_name: "slyxup.online"`** — `auth.slyxup.online/*` etc.
- **Secrets max 512 per Worker** — keep vars minimal

## 4. Best-practice violations to block

- `Math.random()` for tokens → `crypto.randomUUID()`
- Hardcoded secrets in `wrangler.jsonc` or `src/` → `wrangler secret put`
- `env.DB.prepare(...).bind()` without `.bind()` → SQL injection
- Global `let user = ...` across requests → cross-request leak
- `await` missing (floating promise) → `void` or `ctx.waitUntil`
- `wrangler.toml` → `wrangler.jsonc`
- Hand-written `Env` → `wrangler types`
- `pgTable` → `sqliteTable`

## 5. Env parity violations

- Different `compatibility_date` per Worker → unify `2025-08-24`
- `.env` instead of `.dev.vars` → ignored by `wrangler dev`
- Forgetting `pnpm db:migrate:remote` after `local` → prod drift
- Committing `.dev.vars` → leak

## 6. What AI can do when blocked

- Ask: “This needs new auth-side tables — should identity own this, or does it belong in billing.slyxup.online?” (billing data NEVER goes into slyxup_auth)
- Suggest: batch helper, `d1-batch.ts` util, `crypto` wrapper
- Never silently add Postgres/Docker/Next auth logic to `auth.slyxup.online`

---
**AI: If you hit a limit, document it in this file, don't bypass.**
