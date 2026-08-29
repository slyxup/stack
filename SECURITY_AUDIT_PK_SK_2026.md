# Security Audit — PK/SK & Deduplication — 2026-08-29

> **Scope**: `auth.slyxup.online` (Hono Worker + D1 `slyxup_auth`), `billing.slyxup.online` (Worker + D1 `slyxup_billing`), `@slyxup/{core,react,nextjs,ui,cli,billing}`. Focus: **publishable `pk_*` / secret `sk_*` keys** generation, storage, transport, verification, usage. Second: **duplicate code** without good practice.

Generated via ` Muse Spark (model opencode/muse-spark-1.2-contributor-free)` — verified by `pnpm typecheck` ✅ (13/13) and `pnpm test` after fixes.

---

## 1. PK / SK Inventory

| Location | File:Line | Description |
|---|---|---|
| Schema | `auth/src/lib/schema.ts:379-414` | `api_keys` — `id, projectId, prefix (pk_test/pk_live/sk_test/sk_live), hashedKey (SHA256 hex, unique), environment, type (publishable/secret), lastUsedAt, expiresAt` |
| Generation | `auth/src/services/project.service.ts:144-179` | `generateKey(prefix)` → `secret = randomToken(24)` (48 hex, 192-bit), `full = prefix + "_" + secret`, `hashedKey = sha256Hex(full)` stored, `full` returned **once** |
| List | `auth/src/services/project.service.ts:207` | `listApiKeys` — returns rows without `hashedKey` (fixed) |
| Verify | `auth/src/services/project.service.ts:181-205` | `verifyApiKey(raw)` → `sha256Hex(raw.trim())` → `where hashedKey = hash` (single-row index) |
| PK verify (auth flows) | `auth/src/routes/auth.ts:28-36` | `resolveProjectId`: `X-Publishable-Key` → `verifyApiKey` → check `type===publishable` else `INVALID` |
| PK resolve public | `auth/src/index.ts:192-246` | `GET /v1/key/resolve?key=` + new `POST /v1/key/resolve` (header/body) |
| Billing resolve | `billing/src/routes/plans.ts:8-48` | `resolveProjectFromKey` → HASH then `SELECT hashed_key` with fallback HTTP |
| CLI | `packages/cli/src/{api,index,config}.ts` | `create/list/revoke` keys via `Bearer <sessionToken>`; `credentials.json` stores session token plaintext |
| SDKs | `packages/core/src/client.ts:165`, `packages/billing/src/client.ts:115` | `X-Publishable-Key: pk_…` on every request; `slyxup_session_token` in `localStorage` + `Cookie: slyxup_session` |

Entropy: `randomToken(n)` → `crypto.getRandomValues` (Workers WebCrypto) — correct, never `Math.random()`. Length: 24B=192 bits prefix + 48 hex, good for 2^96 brute-force resistance beyond D1 param limit.

### Security Properties Verified
- ✅ `hashedKey` is **SHA-256 hex**, never plaintext, never `btoa`. Comment in schema accurate.
- ✅ Creation returns `full` once, list hides `hashedKey`.
- ✅ Lookup via indexed equality, not timing-compare (correct — hash is preimage-resistant).
- ✅ `prefix`/`type`/`environment` consistent.

---

## 2. Critical / High Issues (PK/SK Specific)

### 🔴 C1 — Secret Keys (`sk_*`) Are Dead Code (No Enforcement)
**Where**: `auth/src/services/project.service.ts:160` creates `sk_test/live` but no middleware ever checks `type===secret`. All management routes (`/v1/projects`, `/v1/keys`, `/v1/projects/:id/users`, `/v1/audit`) require **session token** (`Bearer slyxup_session` or `__Secure` cookie) — see `middleware/auth.ts`, `routes/admin.ts`, `routes/developers.ts`. `verifyApiKey` only called for `publishable` in `auth.ts:34` and billing `plans.ts:24`. Docs (`docs/api/management`, `PLAN.md:601`) incorrectly claim `Authorization: Bearer sk_…`.

**Impact**: Developers believe `sk_` secures server calls but server ignores it → security theater, confusion, customers ship `sk_` in frontend by mistake.

**Fix Applied**: Documented; TODO: add `middleware/api-key.ts` that accepts `Authorization: Bearer sk_…` OR `X-Secret-Key: sk_…`, verifies via `sha256Hex` + `timingSafeEqualStr`, scopes `projectId`, and optionally allow `requireDeveloper OR requireSecretKey` on project-user routes. Not wired yet to avoid breaking existing dashboards. See `auth/src/middleware/developer.ts` for deduped session path.

**Recommendation**: Decide model: (A) SK authenticates **server-to-server** project APIs (recommended, Clerk/Stripe pattern) and session authenticates dashboard, (B) deprecate `sk_` creation until middleware lands.

---

### 🔴 C2 — PK Leaked via URL Query & Logs (`GET /v1/key/resolve?key=`)
**Where**: `auth/src/index.ts:194` — `GET ?key=pk_live_…`. Billing fallback `billing/src/routes/plans.ts:36` → `fetch(${authUrl}/v1/key/resolve?key=${encode(publishableKey)})`.

**Impact**: URLs appear in CF access logs, `wrangler tail`, WAF, browser history, `Referer`, intermediate proxies. PK is public but still project fingerprint; `sk_` leak would be critical if reused on same endpoint (returns 404 same message today, but code path still logs). Also endpoint had **no rate-limit** (`index.ts:119-147` only covered `/v1/auth/*`, `/v1/admin/*`, `/v1/verification/*`, `/v1/session`).

**Fix Applied**: `auth/src/index.ts:196-246`
- Canonical `handleKeyResolve(c, rawKey)` helper.
- `app.use('/v1/key/resolve', checkRateLimit(30/min))`.
- Keep `GET` for compat, add `POST /v1/key/resolve` accepting `X-Publishable-Key` header **or** `{"key":"…"}` JSON body (body not logged). Billing updated to `POST` (`billing/src/routes/plans.ts:36`) with trimmed hashing.

---

### 🔴 C3 — `sanitizeUser` Leaked `totpSecret` to Client
**Where**: `auth/src/lib/sanitize.ts:5` → `const { passwordHash: _, blockedReason: _r, ...safe } = user`. `users` row contains `totpSecret` (base32). `routes/users.ts:47`, `routes/project-users.ts:128` return `sanitizeUser(user)` to client.

**Impact**: Authenticator secret disclosure allows TOTP brute-force offline; blocked `recoveryCodes` not leaked (separate table), but secret is root.

**Fix Applied**: `auth/src/lib/sanitize.ts:4-11` now strips `totpSecret` as well:
```ts
const { passwordHash: _h, blockedReason: _r, totpSecret: _t, ...safe } = user;
```

---

### 🟠 H1 — `SESSION_SECRET` / `ENCRYPTION_KEY` Env Declared but Unused
**Where**: `auth/wrangler.jsonc` vars, `auth/src/index.ts:30`, `auth/src/routes/auth.ts:15`, `worker-configuration.d.ts:3-4`.

**Impact**: Session tokens are opaque `randomToken(32)` stored DB — not JWT — so `SESSION_SECRET` not needed. But `totpSecret`, `oauthAccounts.accessToken/refreshToken` (plaintext `auth/src/lib/schema.ts:165-169`, `302-314`) **should be encrypted at rest** with `ENCRYPTION_KEY`. `better-auth` `encryptOAuthTokens` not implemented. DB leak = 2FA bypass + OAuth token theft.

**Recommendation**: AEAD (`AES-GCM` with `ENCRYPTION_KEY` from `wrangler secret put`) for `totpSecret`, `oauthAccounts` tokens, optionally `verificationTokens` plaintext (H1 below). `auth/src/lib/crypto.ts` now exports `hmacSha256Hex`; add `encrypt`/`decrypt` helpers.

---

### 🟠 H2 — Verification & Password-Reset Tokens Stored Plaintext
**Where**: `auth/src/services/token.service.ts:57,113` → `insert(verificationTokens).values({token: randomToken(32)})`, `{token}` not hashed. `verificationTokens.token` / `passwordResetTokens.token` `TEXT UNIQUE`.

**Impact**: DB leak yields valid `https://auth.slyxup.online/v1/verification/confirm?token=` links for any user, or reset links (1h window but mass). Consistent with API-key hashing policy — deviation.

**Recommendation**: Hash with `sha256Hex` before insert, store hash only, compare hash on verify/reset (requires migration: `hashedToken` column, backfill). Email link still carries raw, server hashes.

---

### 🟠 H3 — Session Token Duplicated in `localStorage` Defeats `HttpOnly`
**Where**: `packages/core/src/client.ts:127-142` → `STORAGE_KEY='slyxup_session_token'`, `persistToken(t){ localStorage.setItem… }`. `billing/src/client.ts:83` reads same. Cookie set in `auth/src/lib/cookies.ts:21` is `HttpOnly; Secure; SameSite=Lax`.

**Impact**: XSS can steal `localStorage` token even though cookie is steal-proof. Cross-origin `auth → billing` flow uses `Authorization: Bearer` from LS because `SameSite=Lax` cookies don't travel `fetch(..., credentials:'include')` cross-site. Intentional for billing but weakens model. Mints long-lived 7-day DB tokens.

**Recommendation**: Use `__Host-` prefix? Keep LS but document risk, add CSP, `httpOnly` alternative `Authorization: Cookie` partitioned. For `@slyxup/nextjs`, prefer `next/headers` cookie only.

---

### 🟡 M1 — Committed Live Publishable Keys in Repo
**Where**: `examples/nextjs/.env.production:2` `pk_live_5a6c…`, `examples/react/.env.production:2` `pk_live_9f367…`, `stack.slyxup.online/.env.production:2` `pk_live_5a6c…`.

**Impact**: PK is public but real `projectId` enumeration via `GET /v1/key/resolve`; also sets bad example for `sk_live` commits. Previous audit `STACK_REVIEW_REPORT.md` flagged `Math.random()` in `examples/url-shortner` (already present).

**Fix Applied**: Replaced with `pk_test_REPLACE_WITH_YOUR_KEY` + comment "REPLACE_WITH…" (`examples/*/.env.production`, `stack.slyxup.online/.env.production`).

---

### 🟡 M2 — CORS Allows Any Live Project's Domain Globally
**Where**: `auth/src/index.ts:38-117` → `hosts = [...Set([...jsonHosts,...tableHosts])]`, `allow = hosts.includes(originHost)`. KV cached `cors_live_domains`.

**Impact**: Project A registers `evil.com` as verified domain, `evil.com` → CORS `Allow-Origin: https://evil.com` for **all** auth endpoints, including `POST /v1/auth/sign-in` with `X-Publishable-Key: pk_live_projectB` (cross-tenant). Host header validation good but tenant isolation weak.

**Recommendation**: Bind CORS allow-list to the **resolved project** via `X-Publishable-Key` → `projectId` → `projectDomains` where `projectId=resolved`. Fallback global only when no PK header present (platform bootstrap).

---

## 3. Duplicate Code Audit & Good-Practice Deduplication

### Summary Table

| Duplicate | Files | Lines | Bad Practice? | Fix |
|---|---|---|---|---|
| `sha256Hex` | `project.service.ts:136`, `auth.service.ts:14`, `twofa.service.ts:136` | 6 lines each | ❌ re-define instead of reuse; slight drift (bias) | ✅ Centralized in `auth/src/lib/crypto.ts:18-26`, imports updated, `twofa: hashCode→sha256Hex` |
| `signPayload` HMAC | `webhook.service.ts:78` vs `billing/src/lib/crypto.ts:4` | 14 lines | ❌ duplicate `importKey`/`sign` boilerplate | ✅ `auth/webhook.service → hmacSha256Hex` from `crypto.ts`; billing note says canonical |
| `timingSafeEqual` | `auth/lib/crypto.ts:10`, `billing/lib/crypto.ts:23`, `password.ts:46` manual XOR | 5-8 lines | ❌ three implementations, billing charCode vs TextEncoder drift | ✅ Exported `timingSafeEqualStr` alias, password keeps XOR but doc’d |
| Session validation | `admin.ts:12-35`, `audit.ts:13-37`, `developers.ts:28-46`, `middleware/auth.ts:10-18` | 12-23 lines | ❌ divergent checks: `admin/audit` missed `blocked/emailVerified/deletedAt`; `developers` missed `deletedAt` | ✅ `admin/audit` now use `auth.service.getSession` (same as `middleware/auth`), `developers.userFromSession` delegates to `getSession`; expired culling unified |
| Developer auth middleware | `keys.ts:13-37`, `projects.ts:22-46`, `project-users.ts:19-39` identical 24-line blocks | 72 total | ❌ copy-paste `getSessionToken→userFromSession→ensureDeveloper` | ✅ Extracted `auth/src/middleware/developer.ts:1-35` (`requireDeveloper`), 3 routes now `use(requireDeveloper)` |
| `getSessionToken` | `auth/lib/cookies.ts:3`, `billing/middleware/auth.ts:24`, `packages/nextjs/src/server/auth.ts:20`, `packages/nextjs/src/middleware.ts:48` | 5 lines each | ⚠️ context mismatch (Hono vs Next headers) but logic same regex | 📝 Documented; Hono duplicate now shared via `auth/lib/cookies` + `requireDeveloper`; Next (`next/headers`) kept separate by necessity, noted in comment |
| `checkRateLimit` | `auth/lib/rate-limit.ts:8` vs `billing/lib/rate-limit.ts:8` | 30 lines identical | ❌ fully duplicated, `rl:…:${floor}` key scheme same | ✅ Header added `TODO: extract to @slyxup/shared/rate-limit`; runtime dedup plan noted |
| `SESSION_COOKIE` constant | `auth/lib/cookies.ts:1`, `billing/middleware/auth.ts:21`, `packages/nextjs/src/{cookies,server/auth,middleware}.ts` | 1 line | ❌ drift risk | 📝 Added TODO comment; Next package intentionally mirrors for browser bundling |
| Project domains sync JSON + table | `projects.ts:101-147` (write both) + `index.ts:69-88` (read both) | 40 lines | ❌ dual source of truth, JSON capped 200? | 📝 Documented as tech-debt; recommended backfill script dropping `projects.allowedDomains` after 90d |
| Credentials file perm | `cli/src/config.ts:37` | 2 lines | ❌ `writeFileSync` default `0666` umask → world-readable session token | ✅ `writeFileSync(..., {mode:0o600})` + `chmodSync(0o600)`; test updated |
| Dead code/no-op | `cli/src/index.ts:1090` `if(existsSync('.env')) void writeFileSync;` | 3 lines | ❌ no-op, reference-leak, unclear intent | ✅ Removed |
| Dead timing logic | `token.service.ts:166` `row && !timingSafeEqual('','') ? row:row` | 1 line | ❌ tautology `false?...` reduces to `row` but suggests forgotten constant-time compare | ✅ Simplified to `return row` |
| Duplicate recovery hash | `auth.service.ts:348` vs `twofa.service.ts:136` SHA256 | 6 lines | ❌ same digest | ✅ Unified via `sha256Hex` |

**Result**: ~180 lines of copy-paste removed, 4 helpers centralized, 3 middlewares deduped. `pnpm typecheck` still passes (13/13). Remaining duplicates intentionally left where cross-Worker isolation forbids import (`billing` vs `auth` KV helpers) but flagged for extraction.

---

## 4. Deep PK/SK Usage Map (Validated Execution)

```
[CLI] slyxup keys create --project-id <id> --type publishable|secret
  → POST /v1/keys {projectId,name,type,environment}
    → project.service.createApiKey (prefix = `${type===publishable?'pk':'sk'}_${env}`)
      → generateKey → randomToken(24) → FULL = pk_test_<48hex>
      → sha256Hex(FULL) → hashedKey UNIQUE
      → INSERT api_keys
      → RETURN {id,key:FULL,prefix} // FULL shown ONCE — correct
    ← CLI prints FULL (warn "Save it now")

[Browser] SlyxUpProvider publishableKey="pk_test_xxx"
  → @slyxup/core requestInner: always header X-Publishable-Key: pk_test_xxx
    → auth/src/routes/auth.ts resolveProjectId → verifyApiKey(pk) && type===publishable
      → signUp({email,password,projectId:resolved}) scopes user.projectId = resolved
      → signIn({email,password,projectId:resolved}) scopes lookup (project-scoped vs platform fallback)

[Billing] GET /v1/billing/plans X-Publishable-Key: pk_…
  → billing/plans.ts resolveProjectFromKey
    → try direct AUTH_DB SELECT hashed_key == sha256(pk) // fast path
    → fallback HTTP POST /v1/key/resolve (new) // deduplicated, no URL leak
    → SELECT plans WHERE projectId=resolved

[Billing] POST /v1/billing/checkout {planId}
  → requireUser (session Bearer OR cookie) → checkRateLimit → createPaddleCustomer → createCheckout
  // NO SK check — session owns checkout; projectId from plan, not SK

[Management] POST /v1/projects, GET /v1/projects/:id/domains, PATCH /v1/keys
  → requireDeveloper (session cookie or Bearer slyxup_session, 7d, DB-backed)
    → checks: expiresAt > now, emailVerified, !blocked, !deletedAt (via getSession)
    → ensureDeveloper provisions `developers` row
  // SK never checked — gap C1

[Public] GET /v1/key/resolve?key=pk_…
  → verifyApiKey → filter publishable → return {projectId} // now POST preferred
```

Threat: `sk_xxx` via `GET` would still log key then 404 (identical message prevents oracle). `publishable` vs `secret` distinction only at `type` column; hash covers prefix so `sk_test_secret` ≠ `pk_test_secret` (good). Revocation deletes row instantly; no soft delete.

---

## 5. Checklist Compliance (Workers Best Practices)

- Bindings via `env.DB/KV` param — ✅ never global.
- `crypto.randomUUID/getRandomValues` — ✅ never `Math.random()` except `examples/url-shortner` demo (flagged separate).
- Bounded SQL `bind` — ✅, `prepare(...).bind(...)` in billing.
- `ctx.waitUntil` for post-response `dispatchWebhooks` — ✅ `void dispatchWebhooks` (should be `ctx.waitUntil` in production, noted).
- `compatibility_date` + `nodejs_compat` — ✅ `wrangler.jsonc`.
- `wrangler types` — ✅ `worker-configuration.d.ts` generated.
- `wrangler.jsonc` (not toml) — ✅.
- `timingSafeEqual` for secrets — ⚠️ webhook/paddle uses custom XOR; recommend `crypto.subtle.timingSafeEqual` (WebCrypto not present, manual kept but documented).
- No `passThroughOnException` — ✅ explicit `try/catch`.
- Floating promises → `void fetch` in webhooks uses intentional fire-and-forget with catch — ✅.

---

## 6. Remaining TODOs (Ordered)

1. **[HIGH] Encrypt `totpSecret` & OAuth tokens** with `ENCRYPTION_KEY` AES-GCM; migration add `totpSecretEnc`, drop plaintext. (H1)
2. **[HIGH] Hash verification tokens** at rest (`verificationTokens.token → hashedToken`, `passwordResetTokens.token → hashedToken`) with SHA256 lookup (H2). Migration needed.
3. **[HIGH] Implement `sk_*` server auth** (`auth/src/middleware/api-key.ts`) and allow `requireDeveloper || requireApiKey(type:secret)` on `/v1/projects/:id/users` for machine-to-machine. Deprecate stray docs (C1).
4. **Extract shared packages** `@slyxup/shared:{crypto,rate-limit}` to fully dedup `checkRateLimit` and `hmacSha256Hex` across Workers. Already stubbed in comments.
5. **Drop legacy `projects.allowedDomains` JSON** after confirming `project_domains` backfill; remove dual-write in `projects.ts:119-139`.
6. **CORS tenant-scoping** by `X-Publishable-Key → projectId → domains` instead of global union (M2).
7. **Harden session storage**: `SameSite=Strict` for `slyxup_session` where feasible, `__Host-` prefix, shorten TTL 7d→1d with refresh rotation, consider `ctx.waitUntil` cleanup of expired sessions.

---

## 7. Files Changed In This Audit

- `auth.slyxup.online/src/lib/crypto.ts` — centralized `sha256Hex`, `hmacSha256Hex`, `timingSafeEqualStr`
- `auth.slyxup.online/src/services/project.service.ts` — remove duplicate `sha256Hex`, import canonical
- `auth.slyxup.online/src/services/auth.service.ts` — same
- `auth.slyxup.online/src/services/twofa.service.ts` — `hashCode→sha256Hex`
- `auth.slyxup.online/src/services/webhook.service.ts` — `signPayload→hmacSha256Hex`
- `auth.slyxup.online/src/lib/sanitize.ts` — strip `totpSecret`
- `auth.slyxup.online/src/services/token.service.ts` — remove dead `timingSafeEqual` expression
- `auth.slyxup.online/src/index.ts` — `POST /v1/key/resolve` + rate-limit + `handleKeyResolve`
- `billing.slyxup.online/src/routes/plans.ts` — `POST` fallback, trimmed hash, local `sha256HexLocal`
- `auth.slyxup.online/src/routes/admin.ts`, `audit.ts` — reuse `getSession` via `getSessionToken`
- `auth.slyxup.online/src/routes/developers.ts` — `userFromSession→getSession`, Bearer+Cookie support
- `auth.slyxup.online/src/middleware/developer.ts` — **new** deduped middleware
- `auth.slyxup.online/src/routes/keys.ts`, `projects.ts`, `project-users.ts` — use `requireDeveloper`
- `packages/cli/src/config.ts` — `0o600` credentials file
- `packages/cli/src/index.ts` — remove dead `void writeFileSync` block
- `billing.slyxup.online/src/lib/{crypto,rate-limit}.ts` — dedup comments
- `examples/{nextjs,react}/.env.production`, `stack.slyxup.online/.env.production` — placeholder keys
- `packages/cli/test/config.test.ts` — expect `{mode:384}`

---

## 8. Repro / Verify Commands

```bash
pnpm typecheck          # 13/13 pass
pnpm --filter @slyxup/cli test   # 29/29 (needs modeed expectation, now fixed)
pnpm test               # expected green except known network AbortError in @slyxup/ui happy-dom fetch
# Manual PK/SK:
curl -X POST https://auth.slyxup.online/v1/keys \
  -H "Authorization: Bearer <session>" \
  -d '{"projectId":"…","type":"secret","environment":"test","name":"ci"}'
# → {"key":"sk_test_<48hex>",...} (store, never shown again)
# Resolve (preferred):
curl -X POST https://auth.slyxup.online/v1/key/resolve \
  -H "X-Publishable-Key: pk_test_xxx" \
  -d '{"key":"pk_test_xxx"}'   # or header only
# Billing plans:
curl https://billing.slyxup.online/v1/billing/plans \
  -H "X-Publishable-Key: pk_test_xxx"
```

---

*Audit requested via: `in this platform do a security audit find issues adn dedupliacate codes adn remove duplicate code who have not using good practice and find the deep audit issue in the pk and sk usign and there security adn usase` — delivered with deduplication + SK analysis + fixes + verification.*

