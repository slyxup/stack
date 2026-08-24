# PLANNING.md — SlyxUp Stack — Top Best Detailed Long Planning for Entire Platform

> **Source of Truth for Building.** Every `feat/` branch, every AI agent, every human must read this before `pnpm build`. This is the **master plan** — product + architecture + DB + API + SDK + UI + CLI + marketing + security + CI/CD + cost + timeline. `PLAN.md` (1507 lines) is the product spec; this file is the **execution plan**.

---

## 0. Table of Contents

1. [Executive Summary & North Star](#1-executive-summary--north-star)
2. [Goals, Non-Goals & Success Metrics](#2-goals-non-goals--success-metrics)
3. [Personas & Jobs To Be Done](#3-personas--jobs-to-be-done)
4. [Scope — V1, V1.1, V2, Out of Scope](#4-scope--v1-v11-v2-out-of-scope)
5. [Architecture — Domain, System, Data Flow](#5-architecture--domain-system-data-flow)
6. [Tech Stack — CF Only + Why + Limits](#6-tech-stack--cf-only--why--limits)
7. [Domain & Deployment Architecture](#7-domain--deployment-architecture)
8. [Database — D1 Detailed Design (11 Tables)](#8-database--d1-detailed-design-11-tables)
9. [API — V1 Contract (30+ Endpoints)](#9-api--v1-contract-30-endpoints)
10. [SDKs — Core → React → Next.js → UI → CLI](#10-sdks--core--react--nextjs--ui--cli)
11. [Marketing Site — stack.slyxup.online](#11-marketing-site--stackslyxuponline)
12. [Security, Threat Model & Compliance](#12-security-threat-model--compliance)
13. [Email & OAuth — Brevo + Google/GitHub](#13-email--oauth--brevo--googlegithub)
14. [Testing Strategy — Unit → Integration → E2E](#14-testing-strategy--unit--integration--e2e)
15. [CI/CD — 3 Workflows (CI/Deploy/Release)](#15-cicd--3-workflows-cideployrelease)
16. [Observability — Logs, Metrics, Alerts](#16-observability--logs-metrics-alerts)
17. [Performance, Scale & Cost](#17-performance-scale--cost)
18. [Timeline — 10 Phases, 8 Weeks, Gantt](#18-timeline--10-phases-8-weeks-gantt)
19. [Risks, Mitigations & ADRs](#19-risks-mitigations--adrs)
20. [How to Use This Plan (AI + Human Checklist)](#20-how-to-use-this-plan-ai--human-checklist)

---

## 1. Executive Summary & North Star

**Product:** SlyxUp Auth — open-source, self-hostable authentication platform (Clerk/Supabase Auth alternative) with **React/Next.js SDKs**, **prebuilt UI**, **CLI-first DX**, **Hosted Pages** (`auth.slyxup.online/sign-in`) + **Embedded** (`<SignIn />`) + **Self-host** (`git clone` + `wrangler dev`).

**North Star:** `npx @slyxup/cli init` in any Next.js app → 30 sec me `SlyxUp Auth is ready` → `pnpm build` green → `https://auth.slyxup.online/v1/health` `200` → `npm view @slyxup/core 0.1.x` published → `stack.slyxup.online` marketing live.

**Monorepo:** `slyxup.online/stack/` (`github.com/slyxup/stack`) — **CF Workers + D1 + KV + R2 only** (no Docker/Postgres). Root `slyxup.online/` has no git.

**Build Order (strict, per `AGENTS.md:18`):** `1 DB Schema → 2 API Contract → 3 Core SDK → 4 React → 5 Next.js → 6 UI → 7 CLI → 8 Workers Plumbing → 9 Website/Docs → 10 CI/Release`. Each phase `pnpm typecheck && pnpm build` green before next, one PR per phase ≤300 lines.

---

## 2. Goals, Non-Goals & Success Metrics

**Goals (V1 8 weeks):**
- G1: Email/password + Google/GitHub OAuth + session + verification + password reset **working e2e** on `auth.slyxup.online` with D1 + KV + HttpOnly cookies
- G2: `packages/core → react → nextjs → ui → cli` published to npm `0.1.x` with `repository` link, `pnpm --filter ... build` green
- G3: `stack.slyxup.online` Pages `out/` export `200` + `auth`/`billing` Workers `health 200` + custom domains `active`
- G4: `CI 2m24s SUCCESS` `Deploy 53s SUCCESS` `Release 49s SUCCESS` on every `push main` (verified `df6f74e` `6474f1d`)
- G5: Self-host: `cp .env.example .dev.vars && pnpm dev` → local `8787` + `3000` works

**Non-Goals (V1 me nahi, `LIMITATIONS.md:3`):** Dashboard, Organizations, SAML/SCIM, Billing/Stripe, Teams, Analytics, Storage, AI, Passkeys, Mobile/Vue/Svelte, 10+ OAuth, multi-region — placeholder only.

**Success Metrics:**
- M1: `pnpm typecheck 7/7` `pnpm build 7/7` `wrangler deploy --dry-run 19.96 KiB` local
- M2: `gh run list` `CI success` `Deploy success` `Release success` for `f51ac15` `df6f74e`
- M3: `npx wrangler d1 execute slyxup_auth --remote --command "SELECT count(*) FROM users"` → `11 tables`
- M4: `npm view @slyxup/core version` `0.1.0` `billing 0.1.1` + `curl https://auth-slyxup-online.slyxup.workers.dev/health` `{"ok":true}`
- M5: `curl https://stack.slyxup.online/` `200` `SlyxUp Stack — Marketing ONLY`

---

## 3. Personas & Jobs To Be Done

| Persona | Who | JTBD | Success |
|---|---|---|---|
| **Developer** (SlyxUp customer) | Uses `slyxup login` CLI, creates `projects`, manages `pk_/sk_` | `npx @slyxup/cli init` in existing Next.js app → detect framework → create project → install SDKs → env configured in 30s | `SlyxUp Auth is ready` + `pk_test_xxx` in `.env.local` |
| **App User** (end user of developer's app) | Uses `<SignIn />` or `auth.slyxup.online/sign-in` | Sign up with email/password or Google/GitHub → verify email → sign in → stay signed in via session cookie | `useUser().user.email` + `useSession().session` + `currentUser()` SSR |
| **Self-hoster** | `git clone` + `wrangler dev` | Replace `auth.slyxup.online` with `auth.example.com` + own D1/KV/Brevo | `wrangler dev --local` `8787` + `3000` works without `slyxup.online` |

**Never mix:** `developers` (CLI, `project_members`) vs `users` (SDK, `sessions`, `oauth_accounts`) — separate tables, separate API, separate SDK.

---

## 4. Scope — V1, V1.1, V2, Out of Scope

**V1 (now, 8 weeks, `ROADMAP.md` Phase 0-9):**
- Auth: email/password `sign-up` `sign-in` `sign-out` `current-user` `sessions` `refresh`, `email verification` `forgot/reset` `change password` `update profile` `delete account`
- OAuth: Google, GitHub only (2 apps: `DEV localhost:8787` + `PROD auth.slyxup.online` — callbacks ` /v1/oauth/callback/{google,github}` ` /sso-callback`, Brevo `noreply@slyxup.online`)
- Sessions: DB `sessions` + KV cache, `HttpOnly Secure SameSite=Lax` cookie `slyxup_session`, `crypto.randomUUID()` `crypto.getRandomValues()`, `ctx.waitUntil` for KV write
- Keys: `pk_test/live_` `sk_test/live_` (CLI `slyxup keys create/list/revoke`), `api_keys` table `hashed_key` unique, `prefix` index
- Projects: `developers` `projects` `project_members` (owner/admin/member), `users` per `projectId`
- SDKs: `core` (client, auth, sessions, users, errors, types) → `react` (`SlyxUpProvider`, `useAuth`, `useUser`, `useSession`) → `nextjs` (server `currentUser()`, `slyxupMiddleware()`, cookies) → `ui` (`SignIn/SignUp/UserButton/...` built on `react`, not vice versa) → `cli` (`login, logout, init, create, project, keys, env, doctor`)
- Marketing: `stack.slyxup.online` Pages `out/` export `200` (no dashboard/keys UI)
- Billing: placeholder Worker `billing.slyxup.online` `200 placeholder`

**V1.1 (next 2 weeks, after V1 stable):**
- Rate limiting (KV `rate_limits`), brute-force protection, audit_logs, webhook_endpoints/deliveries
- Email abstraction `EmailService` (Brevo SMTP + Resend/SES adapters)

**V2 (later, separate PRDs):**
- Organizations, Teams, SAML/SCIM, Enterprise SSO, Dashboard `dashboard.slyxup.online`, Billing `billing.slyxup.online` with Stripe, Passkeys, Mobile SDKs, 10+ OAuth (Apple/Microsoft/Discord), FTS5 search, R2 for avatars >25MiB

**Out of Scope (never in V1, `LIMITATIONS.md`):** Multi-region, complex admin panel, Vue/Svelte, React Native, Analytics, Storage, AI — if AI adds, stop and ask.

---

## 5. Architecture — Domain, System, Data Flow

**Domain (CF Workers + D1, domain-based, `STRUCTURE.md`):**
```
slyxup.online/ (root, no git) → stack/ (monorepo github.com/slyxup/stack)
├── auth.slyxup.online/ → Worker https://auth.slyxup.online (Hono + D1 slyxup_auth cfa91e79 + KV 99d2ebe4 + R2 slyxup-storage)
│   ├── API: /v1/* (SDK hits)
│   └── Hosted Pages: /sign-in /sign-up /verify /sso-callback /sign-out
├── stack.slyxup.online/ → Pages https://stack.slyxup.online (Next.js export out/ → Pages stack-slyxup-online, custom domain active)
├── billing.slyxup.online/ → Worker https://billing.slyxup.online (placeholder, D1 slyxup_billing 5c5a0f61 + KV 74a592aa)
└── packages/* → npm @slyxup/* (core → react → nextjs → ui → cli → billing)
```

**System (Workers):**
```
[Browser] → stack.slyxup.online (Pages, static) — no auth logic
[Browser] → auth.slyxup.online/v1/* (Hono, Zod, drizzle(env.DB), KV) → D1 (SQLite) + KV (session cache) + R2 (future)
[Browser] → auth.slyxup.online/sign-in?redirect_url=... (Hosted) → set HttpOnly cookie on auth domain → redirect → myapp.com/callback → SDK verifies via /v1/session
[CLI] → auth.slyxup.online/v1/projects + /v1/keys → D1 developers/projects/api_keys
```

**Data Flow — Embedded vs Hosted:**
- Embedded: `myapp.com` `<SlyxUpProvider><SignIn /></SlyxUpProvider>` → `fetch auth.slyxup.online/v1/auth/sign-in` → `Set-Cookie slyxup_session` (SameSite Lax, Secure, HttpOnly) → `useSession()` → `ctx.waitUntil(KV.put(sessionToken, userId))`
- Hosted: `myapp.com` redirect → `auth.slyxup.online/sign-in?publishable_key=pk_test_xxx&redirect_url=myapp.com/callback` → login → `Set-Cookie` on `auth` domain → `302 myapp.com/callback?session=...` → `myapp` SDK `GET /v1/session` with cookie/query → `currentUser()`

**Dependency Graph (must enforce):**
```
@slyxup/ui → @slyxup/react → @slyxup/core
@slyxup/nextjs → @slyxup/core (and react for provider)
@slyxup/billing → @slyxup/core
CLI → Management API (projects/keys, not SDK)
Never reverse: react → ui is forbidden
```

---

## 6. Tech Stack — CF Only + Why + Limits

| Layer | Choice | Why | Limits |
|---|---|---|---|
| Runtime | Cloudflare Workers `wrangler dev/deploy` `wrangler.jsonc` `compatibility_date 2025-08-24` `nodejs_compat` | Edge, zero cold start, D1/KV native, `pnpm-workspace.yaml` domain-based | 128MB RAM, 50ms free CPU/30s paid, no `fs`/`child_process`, 6 D1 conns/worker, 1000 queries/invocation |
| Framework | Hono `fetch` handler `new Hono<{Bindings}>` `app.route('/v1', auth)` | Light, Workers-compatible, `zValidator` | No `any` on `Env`, `wrangler types` generates `Env` |
| DB | Cloudflare D1 SQLite `cfa91e79` `5c5a0f61` `drizzle-orm/d1` `sqlite-core` | Edge SQLite, single-writer Durable Object, 10GB, zero ops | 100 bound params, no `BOOL`/`DATETIME`, FK always ON, single-threaded, `floor(100/cols)` batch, `integer({mode:'boolean'})` `integer({mode:'timestamp'})` `text({mode:'json'}).$type<T>()` `crypto.randomUUID()` |
| KV | Cloudflare KV `99d2ebe4` `74a592aa` | Session cache, rate-limit, `ctx.waitUntil(KV.put)` | Eventually consistent, 25MB value, `TTL` via `expirationTtl` |
| R2 | `slyxup-storage` `slyxup-storage-dev` `auth-avatars` | >25MiB objects, avatars | 10GB free, `env.STORAGE.get/put` |
| ORM | Drizzle `drizzle-kit generate` `drizzle.config.ts` `dialect sqlite` `driver d1-http` | `wrangler d1 migrations apply` local+remote, `relations()` | `db.query` needs `relations` defined, prefer `db.select().where(eq(...)).get()` |
| Validation | Zod `zValidator('json', schema)` | `drizzle-zod` if needed, `Hono` + `Zod` | `z.record(z.string(), z.unknown())` for Zod 4 |
| Password | PBKDF2 100k `SHA-256` via `crypto.subtle` (WebCrypto) — prod `oslo` Argon2id | Workers `crypto.getRandomValues()` `crypto.randomUUID()` never `Math.random()` | `timingSafeEqual` for compare |
| Sessions | D1 `sessions` + KV + `HttpOnly Secure SameSite=Lax` `slyxup_session` cookie `expiresAt = now+7d` | `randomToken(32)` `expirationTtl` | `KV` eventual, `D1` single writer |
| Email | Brevo `smtp-relay.brevo.com:587` `BREVO_API_KEY xsmtpsib-...` `noreply@slyxup.online` | `EmailService` abstraction (SMTP/Resend/SES) | Verify `brevo1/2._domainkey` `DMARC rua@dmarc.brevo.com` `MX route*.mx.cloudflare.net` |
| OAuth | Google `733897...na0red (DEV)` `o1rel (PROD)` + GitHub `Ov23liah (DEV)` `Ov23liAP (PROD)` | 2 apps each (GitHub only 1 callback per app) | `Authorized redirect URIs` `http://localhost:8787/v1/oauth/callback/*` vs `https://auth.slyxup.online/v1/oauth/callback/*` ` /sso-callback` |
| Logging | `observability: {enabled:true, head_sampling_rate:1}` + `Pino` JSON | `wrangler tail` | `head_sampling_rate:1` for V1 |
| Testing | Vitest `globals:true` + `wrangler dev --local` D1 `env.DB` | `pnpm test` `wrangler dev --local --test` | No Jest globals |
| Package | `pnpm@9.0.0` `turbo 2.10.11` `tasks: build` `biome 1.9.4` `husky 9.1.7` `commitlint` `changesets` | `pnpm-workspace.yaml` `workspaces: ["auth*", "stack*", "billing*", "packages/*"]` | `turbo tasks` not `pipeline` (migrated) |
| Types | `typescript 5.9.3` `strict:true` `moduleResolution: bundler` `jsx: react-jsx` `DOM` for nextjs | `tsc --noEmit` `wrangler types` → `worker-configuration.d.ts` | `jsx: preserve` for `stack` Pages `next` plugin |

**Never use:** `pgTable` `neon` `supabase` `prisma` `docker-compose.yml` `Math.random()` `process.env.DATABASE_URL` in Worker (use `env.DB`) `wrangler.toml` (use `jsonc`).

---

## 7. Domain & Deployment Architecture

**Wrangler per domain (`wrangler.jsonc`):**

* `auth.slyxup.online` `name: auth-slyxup-online` `main: src/index.ts` `d1_databases: [{binding: DB, database_name: slyxup_auth, database_id: cfa91e79, migrations_dir: migrations}]` `kv_namespaces: [{binding: KV, id: 99d2ebe4}]` `r2_buckets: [{binding: STORAGE, bucket_name: slyxup-storage}]` `vars: {APP_URL, API_URL, HOSTED_AUTH_URL, CORS_ORIGINS, ALLOWED_REDIRECT_ORIGINS, GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, EMAIL_FROM, BREVO_SENDER}` `routes: [{pattern: auth.slyxup.online/*, zone_name: slyxup.online}]` `observability` `compatibility_date 2025-08-24`
* `stack.slyxup.online` `name: stack-slyxup-online` `assets: {directory: .next or out/ for Pages export, not_found_handling: single-page-application}` `vars: {NEXT_PUBLIC_SLYXUP_API_URL: https://auth.slyxup.online}` `routes: [{pattern: stack.slyxup.online/*, zone_name: slyxup.online}]` (Pages `stack-slyxup-online.pages.dev` + custom `stack.slyxup.online` `active` 09:13:41)
* `billing.slyxup.online` `name: billing-slyxup-online` `d1_databases: [{binding: DB, database_name: slyxup_billing, database_id: 5c5a0f61}]` `kv: 74a592aa` `routes: [{pattern: billing.slyxup.online/*}]`

**DNS (`slyxup.online` zone `01d414e013034d6a719e3982baae5c75`):**
* `stack.slyxup.online` `CNAME stack-slyxup-online.pages.dev Proxied Auto` ✅
* `auth.slyxup.online` `A 192.0.2.1 Proxied Auto` (Workers route, `dig` should `104.21...`) — if `NXDOMAIN` add via `POST /zones/.../dns_records` `{"type":"A","name":"auth","content":"192.0.2.1","proxied":true}`
* `billing.slyxup.online` `A 192.0.2.1 Proxied`
* `brevo1/2._domainkey` `CNAME b1/b2.slyxup-online.dkim.brevo.com DNS only 1hr` + `_dmarc TXT v=DMARC1 p=none rua=mailto:rua@dmarc.brevo.com` + `MX route*.mx.cloudflare.net` + `cf2024-1._domainkey TXT DKIM`

**Deploy:**
```
GitHub slyxup/stack (slyxup.online/stack/) → pnpm install --frozen-lockfile → pnpm typecheck → pnpm lint → pnpm build (turbo 7/7) → wrangler deploy (per domain, CLOUDFLARE_API_TOKEN+ACCOUNT_ID)
auth: pnpm --filter auth.slyxup.online deploy → wrangler deploy (83.78 KiB gzip 19.96 KiB) → Version a1b522ee... → auth.slyxup.online/* (Workers)
stack: pnpm --filter stack.slyxup.online build (next build → out/ export) → npx wrangler pages deploy stack.slyxup.online/out --project-name=stack-slyxup-online --branch=main → https://f4107250.stack-slyxup-online.pages.dev + custom stack.slyxup.online (Pages)
billing: pnpm --filter billing.slyxup.online deploy → 83.72 KiB
```

**Env parity (`ENV_GUIDE.md`):** `wrangler.jsonc vars` same dev/prod (committed), `.dev.vars` local secrets (gitignored, `cp .env.example auth.slyxup.online/.dev.vars`), prod `wrangler secret put SESSION_SECRET` (encrypted). `D1/KV IDs` via `wrangler d1 create` output. No `.env` in Workers.

---

## 8. Database — D1 Detailed Design (11 Tables)

**Current `auth.slyxup.online/migrations/0001_square_sally_floyd.sql:1` 49 commands, `11 tables` verified `d1_migrations` + `users` + 9 new, `f51ac15` `migrate:local+remote` ✅:**

```typescript
// D1-correct patterns per d1-drizzle-schema skill
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

developers: id text PK $defaultFn(crypto.randomUUID()), email text unique notNull, emailVerified integer boolean default false, passwordHash text, name text, avatarUrl text, createdAt integer timestamp $defaultFn(()=>new Date()), updatedAt integer timestamp $onUpdate(()=>new Date()), uniqueIndex developers_email_idx
projects: id text PK, developerId text FK developers.id cascade notNull, name text notNull, slug text unique notNull, description text, createdAt/updatedAt timestamp, index developer_idx, unique slug_idx
projectMembers: id text PK, projectId text FK projects cascade, developerId text FK developers cascade, role text enum [owner,admin,member] default member, createdAt timestamp, unique project_developer_idx, index developer_idx
users: id text PK $defaultFn, projectId text FK projects cascade (nullable for migration, 0 rows), email text notNull, emailVerified boolean default false, passwordHash text, firstName/lastName/avatarUrl text, preferences text json $type<Record<string,unknown>>, createdAt/updatedAt timestamp, unique email_project_idx, index project_idx, email_verified_idx
userProfiles: id text PK, userId text unique FK users cascade notNull, bio text, phone text, metadata text json, createdAt/updatedAt timestamp, unique user_idx
sessions: id text PK, userId text FK users cascade notNull, projectId text FK projects cascade, token text unique notNull, ipAddress text, userAgent text, expiresAt timestamp notNull, createdAt/updatedAt timestamp, unique token_idx, index user_idx, project_idx, expires_idx
oauthAccounts: id text PK, userId text FK users cascade notNull, provider text enum [google,github] notNull, providerAccountId text notNull, accessToken text, refreshToken text, expiresAt timestamp, scope text, createdAt/updatedAt timestamp, unique provider_idx (provider, providerAccountId), index user_idx
verificationTokens: id text PK, userId text FK users cascade, email text notNull, token text unique notNull, expiresAt timestamp notNull, createdAt timestamp, unique token_idx, index email_idx, expires_idx
passwordResetTokens: id text PK, userId text FK users cascade, email text notNull, token text unique notNull, expiresAt timestamp notNull, used boolean default false, createdAt timestamp, unique token_idx, index email_idx, expires_idx
apiKeys: id text PK, projectId text FK projects cascade notNull, name text notNull, prefix text notNull (pk_test_ etc), hashedKey text unique notNull, environment text enum [test,live] default test, type text enum [publishable,secret] notNull, lastUsedAt timestamp, expiresAt timestamp, createdAt/updatedAt timestamp, index project_idx, unique hashed_key_idx, index prefix_idx
```

**Relations:** `developers → many projects, memberships`, `projects → one developer, many members/users/apiKeys`, `users → one project, one profile, many sessions/oauthAccounts`, etc. + `export type User = typeof users.$inferSelect`.

**Indexes:** `uniqueIndex` for `email` `slug` `token` `hashedKey`, `index` for `projectId` `userId` `expiresAt` — naming `{table}_{column}_idx`.

**Batch:** `BATCH_SIZE = floor(100 / cols)` for `D1_ERROR: too many bound parameters`.

**Future:** `audit_logs` `rate_limits` `webhook_endpoints/deliveries` (V1.1).

---

## 9. API — V1 Contract (30+ Endpoints)

**Hono `src/index.ts:12` with `Bindings: {DB, KV, STORAGE, SESSION_SECRET, ENCRYPTION_KEY, APP_URL, CORS_ORIGINS, ...}` + `app.use(cors)` + `app.route('/v1/auth', auth)` + `app.route('/v1', auth)` for `/v1/session` etc. + `crypto.randomUUID()` `prepare().bind().all()` `ctx.waitUntil()` `wrangler types`.**

| Method | Path | Zod Schema | Service | DB | Auth | Description |
|---|---|---|---|---|---|---|
| POST | `/v1/auth/sign-up` | `signUpSchema {email, password, projectId?, firstName?, lastName?}` | `signUp()` `hashPassword` → `users` + `verificationTokens` + `sessions` | `users` `verification_tokens` `sessions` | No | Create user + session, set `slyxup_session` cookie `7d`, send Brevo verify mail |
| POST | `/v1/auth/sign-in` | `signInSchema {email, password, projectId?}` | `signIn()` `verifyPassword` → `sessions` | `users` `sessions` | No | Verify, create session, set cookie, return `user {id,email}` |
| POST | `/v1/auth/sign-out` | — (cookie) | `signOut()` `delete sessions where token` | `sessions` | Yes (cookie) | Clear `slyxup_session` |
| GET | `/v1/session` | — | `getSession(token)` `expiresAt > now` → `user` | `sessions` `users` | Yes | Return `user` + `session {expiresAt}` |
| GET | `/v1/user` | — | same | `users` | Yes | Return `user` |
| POST | `/v1/verification/verify` | `verifyEmailSchema {token}` | `verifyEmail()` → `users.emailVerified=true` | `verification_tokens` `users` | No | Token `expires 24h` |
| POST | `/v1/verification/resend` | `resendVerificationSchema {email}` | `resend` → new `verificationTokens` | `verification_tokens` | No | Brevo |
| POST | `/v1/password/forgot` | `forgotPasswordSchema {email}` | `forgot` → `passwordResetTokens` | `password_reset_tokens` | No | Brevo reset mail |
| POST | `/v1/password/reset` | `resetPasswordSchema {token, password}` | `reset` `hashPassword` `used=false` `expiresAt` | `password_reset_tokens` `users` | No | Update `passwordHash` |
| POST | `/v1/password/change` | `changePasswordSchema {currentPassword, newPassword}` | `change` `verifyPassword` → `hashPassword` | `users` | Yes | |
| PATCH | `/v1/user` | `updateProfileSchema {firstName, lastName, avatarUrl}` | `updateProfile()` | `users` `user_profiles` | Yes | |
| DELETE | `/v1/user` | `deleteAccountSchema {password?}` | `deleteAccount()` `delete users cascade` | `users` | Yes | |
| GET | `/v1/oauth/google` | — | `oauth.service` `state` `PKCE` | `oauth_accounts` | No | Redirect to Google `https://accounts.google.com/o/oauth2/v2/auth?client_id=733897...o1rel...&redirect_uri=https://auth.slyxup.online/v1/oauth/callback/google` |
| GET | `/v1/oauth/callback/google` | `code, state` | `callback` `state` validate `timingSafeEqual` → `users` upsert → `sessions` | `users` `oauth_accounts` `sessions` | No | Set cookie, redirect `ALLOWED_REDIRECT_ORIGINS` |
| GET | `/v1/oauth/github` | — | Same for `Ov23liAP...` `https://github.com/login/oauth/authorize` | | | |
| GET | `/v1/oauth/callback/github` | | | | | |
| GET/POST | `/v1/projects` `POST` | `projectSchema {name, slug}` | `project.service` | `projects` | Yes (developer) | CLI `slyxup project create` |
| GET | `/v1/projects/:id` | | | `projects` `project_members` | Yes | |
| POST | `/v1/keys` | `keySchema {projectId, name, type publishable/secret, environment test/live}` | `api-key.service` `pk_test_xxx` `hashedKey` | `api_keys` | Yes | `slyxup keys create` |
| GET | `/v1/keys?projectId=` | | | `api_keys` | Yes | `slyxup keys list` |
| DELETE | `/v1/keys/:id` | | `revoke` | `api_keys` | Yes | `slyxup keys revoke` |
| GET | `/v1/health` | — | | — | No | `{ok:true, db:!!env.DB, version:0.1.2}` |

**Hosted Pages (same Worker, `app.get('/sign-in')` etc.):** `/sign-in` ` /sign-up` ` /verify` ` /forgot-password` ` /sso-callback` ` /sign-out` — `?redirect_url=https://myapp.com/callback&publishable_key=pk_test_xxx` → login → `Set-Cookie` on `auth.slyxup.online` → `302 myapp.com/callback`.

**Middleware:** `cors.ts` (`CORS_ORIGINS` `https://stack.slyxup.online,http://localhost:3000`), `auth.ts` (`getSessionToken` from `Cookie` `slyxup_session` or `Authorization: Bearer`), `rate-limit.ts` (KV `rate_limits` `floor(100/cols)`), `security.ts` (`secureHeaders` `csrf`), `error.ts` (`onError` JSON).

**Validation:** `zValidator('json', schema)` `c.req.valid('json')` fully typed, `emailSchema` `passwordSchema` `projectIdSchema` reused.

---

## 10. SDKs — Core → React → Next.js → UI → CLI

**Dependency (never reverse):** `@slyxup/ui → @slyxup/react → @slyxup/core` `nextjs → core` `billing → core` `cli → core`.

**Core `packages/core` (`client.ts` `auth.ts` `sessions.ts` `users.ts` `errors.ts` `types.ts`):**
```ts
// client.ts
export class SlyxupClient { constructor({ publishableKey, apiUrl="https://auth.slyxup.online" }) {} auth: { signUp, signIn, signOut }; sessions: { get }; users: { me, update } }
// Usage: const client = new SlyxupClient({ publishableKey: "pk_test_xxx" }); await client.auth.signIn({email, password})
```
* `pnpm build` `tsc -p tsconfig.json` `dist/index.js` `types` `0.1.x` published `f4b4271` `repository` `publishConfig public`.*

**React `packages/react` (`SlyxUpProvider.tsx` `auth-context.ts` `useAuth/useUser/useSession`):**
```tsx
<SlyxUpProvider publishableKey="pk_test_xxx" apiUrl="https://auth.slyxup.online">
  <App />
</SlyxUpProvider>
const { isLoaded, isSignedIn, signIn, signOut } = useAuth();
const { user } = useUser(); // {id,email, firstName, lastName}
const { session } = useSession(); // {id, expiresAt}
```
*Depends on `core`, `jsx: react-jsx` `lib: DOM` fixed `TS6142`.*

**Next.js `packages/nextjs` (`server/auth.ts` `current-user.ts` `middleware.ts` `cookies.ts`):**
```ts
// App Router Server Component
import { currentUser } from '@slyxup/nextjs/server';
const user = await currentUser(); // from cookies `slyxup_session` via `env.DB` or fetch `https://auth.slyxup.online/v1/session`

// middleware.ts
import { slyxupMiddleware } from '@slyxup/nextjs/middleware';
export default slyxupMiddleware(); // protects routes, redirects to /sign-in if no session
export const config = { matcher: ['/dashboard/:path*'] };

// Cookies
// Next.js `cookies()` `get('slyxup_session')` → `drizzle` or `fetch`
```
*Supports `App Router` `Server Components` `Server Actions` `Route Handlers` `Middleware` `SSR`.*

**UI `packages/ui` (built on `react`, 8 components, `shadcn` + `tailwind v4` `@theme` in CSS, no `tailwind.config.js`):**
* `SignIn` `SignUp` `UserButton` `UserProfile` `ForgotPassword` `ResetPassword` `EmailVerification` `SocialButtons`
```tsx
import { SignIn } from '@slyxup/ui';
<SlyxUpProvider><SignIn /></SlyxUpProvider>
// Custom: const { signIn } = useAuth(); <input onClick={()=>signIn({email,password})}>
```
*Each `src/components/SignIn/` etc. + `styles/` `index.ts`.*

**CLI `packages/cli` (`@slyxup/cli` `slyxup` bin, `commander` + `prompts` + `chalk` + `ora`):**
```
slyxup login          → OAuth device flow → ~/.config/slyxup/credentials.json (never commit)
slyxup logout
slyxup init           → detect Next.js/React, App Router, TS, pnpm → ? Create new project / Select existing → install @slyxup/* → env pull
slyxup create         → create project
slyxup project create/list/delete
slyxup keys create/list/revoke → pk_test_xxx sk_test_xxx
slyxup env pull       → pull SLYXUP_SECRET_KEY from api
slyxup doctor         → check framework, env, D1
```
*Detectors `framework.ts` `nextjs.ts` `react.ts`, Generators `nextjs.ts` `react.ts`, API `client.ts` (fetch `https://auth.slyxup.online/v1/projects`), Config `~/.config/slyxup/` ` .slyxup/project.json` (gitignored), Utils `filesystem.ts` `package-manager.ts`.*

**Billing `packages/billing` (future, placeholder `billing.slyxup.online`):** `src/index.ts` `placeholder`, `wrangler.jsonc` `slyxup_billing 5c5a0f61`, `depends on core`.

**Examples `examples/nextjs` `react`:** Basic setup `SignIn` `SignUp` `UserButton` `Sign out` `Protected page` `currentUser()` — also integration tests.

---

## 11. Marketing Site — stack.slyxup.online

**Pages `stack.slyxup.online` — MARKETING ONLY (no auth logic, no dashboard, no `create-project`):**

*Tech:* `Next.js 15.0.0` `TypeScript` `Tailwind v4` `@theme` `shadcn/ui` `MDX` `next.config.mjs` `output: 'export'` → `out/` → `wrangler pages deploy stack.slyxup.online/out --project-name=stack-slyxup-online`

*Wrangler:* `name: stack-slyxup-online` `assets: {directory: out, not_found_handling: single-page-application}` `vars: {NEXT_PUBLIC_SLYXUP_API_URL: https://auth.slyxup.online}` `routes: [{pattern: stack.slyxup.online/*, zone_name: slyxup.online}]` `observability` `compatibility_date 2025-08-24`

*Pages:* `app/page.tsx` `features` `pricing` `react` `nextjs` `cli` `self-hosting` `security` `pricing` `docs` `blog` `about` — all `export` static `139 B` `99.2 kB` `Pages` `stack-slyxup-online.pages.dev` `active` 09:13:41 `CNAME stack-slyxup-online.pages.dev Proxied`

*Deploy:* `pnpm --filter stack.slyxup.online build` (Next `✓ Compiled` `4/4` `Exporting 3/3`) → `npx wrangler pages deploy` `81 files` `f4107250` `https://f4107250.stack-slyxup-online.pages.dev` + custom `https://stack.slyxup.online` `200` `SlyxUp Stack — Marketing ONLY`.

---

## 12. Security, Threat Model & Compliance

**Threat Model (OWASP):** `SQL injection` → `env.DB.prepare(sql).bind(...).all()` always `bind` + `drizzle` `eq()` (never string concat), `XSS` → `c.html` escaped + `secureHeaders`, `CSRF` → `SameSite Lax` + `csrf` middleware for `POST /v1/*`, `Brute force` → KV `rate_limits` `100 req/15m` per IP + `timingSafeEqual` for token compare, `Session hijack` → `HttpOnly Secure SameSite` `slyxup_session` `7d` `expiresAt` `KV` `ctx.waitUntil`, `OAuth CSRF` → `state` `crypto.randomUUID()` + `PKCE` `code_verifier` `timingSafeEqual`.

**At-rest:** `passwordHash` PBKDF2 `100k SHA-256` `salt 16B` `hash 32B` `base64(salt):base64(hash)` (prod `oslo` Argon2id), `api_keys.hashedKey` `SHA-256` + `hashed` unique, `secrets` via `wrangler secret put` (encrypted at rest, never in `wrangler.jsonc` or `.dev.vars` commit), `D1` encrypted at rest.

**In-transit:** `Secure` cookies, `CORS` `https://stack.slyxup.online,http://localhost:3000`, `ALLOWED_REDIRECT_ORIGINS` whitelist `https://myapp.com`, `HSTS` via `secureHeaders`.

**Headers:** `Content-Security-Policy` `X-Frame-Options: DENY` `X-Content-Type-Options: nosniff` `Referrer-Policy: strict-origin-when-cross-origin`.

**Audit:** `audit_logs` (V1.1) `userId` `action` `ip` `userAgent` `createdAt`, `SECURITY.md` `security@slyxup.online` `CODEQL` `ci.yml security` job.

**Never:** `plain-text passwords` `JWTs containing passwords` `secret keys in frontend` `Math.random()` `process.env.DATABASE_URL` in Worker `hardcoded secrets`.

**Compliance:** `LICENSE MIT` (or `Apache-2.0` for patent), `CODE_OF_CONDUCT.md`, `SECURITY.md` private advisory, `GDPR` `delete account` `cascade`.

---

## 13. Email & OAuth — Brevo + Google/GitHub

**Email `noreply@slyxup.online` Brevo `smtp-relay.brevo.com:587` `BREVO_API_KEY xsmtpsib-c12449a...` `BRAVO_API_KEY` alias, `EMAIL_FROM_NAME SlyxUp`:**

*Brevo Dashboard:* `Senders & Domains` → `noreply@slyxup.online` verify + `slyxup.online` domain `brevo1/2._domainkey CNAME b1/b2.slyxup-online.dkim.brevo.com DNS only 1hr` + `_dmarc TXT v=DMARC1 p=none rua=mailto:rua@dmarc.brevo.com` + `MX route*.mx.cloudflare.net` (all active per `dig`).

*Abstraction:* `src/services/email.service.ts` `EmailService` interface `send(to, subject, html)` → `BrevoProvider` `ResendProvider` `SESProvider` `SMTPProvider`, `wrangler secret put BREVO_API_KEY` prod, `.dev.vars` local.

*Flows:* `sign-up` → `verificationTokens` `token 32B` `expires 24h` → Brevo `verify` mail `https://auth.slyxup.online/verify?token=...` → `GET /v1/verification/verify?token` → `users.emailVerified=true`, `forgot` → `passwordResetTokens` `used boolean` `expires 1h` → Brevo `reset` mail.

**OAuth 2 apps (GitHub needs 2, Google can have 1 with multiple URIs but we use 2 for parity):**

| Env | Google `733897164108-...` | GitHub `Ov23...` | Authorized redirect URIs | Homepage |
|---|---|---|---|---|
| DEV `localhost` | `na0redpq71mhhjdnvol7q3kp8eibf5ht` `GOCSPX--N915...` | `Ov23liahxRU14Rob6FEF` `cd8712...` | `http://localhost:8787/v1/oauth/callback/google` `http://localhost:8787/sso-callback` `http://localhost:3000/api/auth/callback/google` (same for `github`) | `http://localhost:3000` |
| PROD `auth.slyxup.online` | `o1reljhjoi3oho61hcksv5lv693u09ji` `GOCSPX-sDxE...` | `Ov23liAPqCFTwbp2umVu` `306f8c4d...` | `https://auth.slyxup.online/v1/oauth/callback/google` `https://auth.slyxup.online/sso-callback` `https://stack.slyxup.online/api/auth/callback/google` | `https://stack.slyxup.online` |

*Storage:* DEV `auth.slyxup.online/.dev.vars` `GOOGLE_CLIENT_ID/SECRET` `GITHUB_CLIENT_ID/SECRET` (gitignored), PROD `wrangler.jsonc vars: GOOGLE_CLIENT_ID` `GITHUB_CLIENT_ID` (public) + `wrangler secret put GOOGLE_CLIENT_SECRET` `GITHUB_CLIENT_SECRET` (`wrangler secret list` 7: `SESSION_SECRET` `ENCRYPTION_KEY` `BREVO_API_KEY` `BRAVO_API_KEY` `GOOGLE_CLIENT_SECRET` `GITHUB_CLIENT_SECRET` `SMTP_PASSWORD`).

*Flow:* `GET /v1/oauth/google` → `state=crypto.randomUUID()` `KV.put(state, PKCE)` `302 https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=https://auth.slyxup.online/v1/oauth/callback/google&state=...&code_challenge=...` → callback `state` `timingSafeEqual` → `users` upsert → `oauth_accounts` `accessToken` → `sessions` → `Set-Cookie` → `302 ALLOWED_REDIRECT_ORIGINS`.

---

## 14. Testing Strategy — Unit → Integration → E2E

**Stack:** `Vitest` `globals:true` `coverage 80%` for `auth.slyxup.online/src/services/*` (CI fails if `<80%`), `wrangler dev --local` `env.DB` `unstable_dev` mock `KV` `ctx.waitUntil`.

**Unit `tests/integration/*` (Vitest, D1 local):**
```ts
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../src/lib/schema';
test('create user', async () => {
  const db = drizzle(env.DB, { schema });
  await db.insert(users).values({ email: 'a@b.com' });
  const found = await db.select().from(users).where(eq(users.email, 'a@b.com')).get();
  expect(found?.email).toBe('a@b.com');
});
// Batch: assert floor(100/cols)
```

**Workers (Hono `app.request()`):**
```ts
const res = await app.request('/v1/auth/sign-up', { method: 'POST', body: JSON.stringify({email: 'a@b.com', password: '12345678'}), headers: {'Content-Type':'application/json'} }, { DB: mockDB, KV: mockKV });
expect(res.status).toBe(201);
expect(res.headers.get('Set-Cookie')).toContain('slyxup_session');
```

**E2E `tests/e2e`:**
* `wrangler dev --local --port 8789` `http://localhost:8789/v1/health` `200` `db:true` + `http://localhost:3000` `pnpm --filter stack.slyxup.online dev` `next dev`
* `examples/nextjs` `react` as integration: `SignIn` `SignUp` `UserButton` `Protected page` `currentUser()` via `Playwright` for `ui` (`packages/ui`).

**Coverage:** `pnpm test -- --coverage` `80%` for `services`, `ci.yml: Test` step `pnpm test --if-present` (currently `ERR_PNPM_NO_SCRIPT` but `ci` still `success` as `if-present`).

---

## 15. CI/CD — 3 Workflows (CI/Deploy/Release) — No Duplicate

**Renamed for clarity (per user `06dbfc3`):**
* `1. CI — Verify (Lint, Typecheck, Build & Test)` `ci.yml` `on: push main, pull_request` `concurrency: cancel-in-progress` `permissions: contents: read, security-events: write, actions: read` → jobs `ci` (`install` `Typecheck` `Lint biome` `Build turbo 7/7` `Test` `Drizzle check` `Wrangler types`) + `security` (`codeql-action/init` `analyze` `javascript-typescript`) — now both `success` after `permissions: write` fix (`2m24s SUCCESS` for `6474f1d` `df6f74e`).
* `2. Deploy — Cloudflare (Workers + Pages)` `deploy.yml` `on: push main, workflow_dispatch` → jobs `deploy-auth` (`if: contains(auth.slyxup.online/)` `pnpm --filter auth run deploy` `CLOUDFLARE_API_TOKEN+ACCOUNT_ID`) `deploy-stack` (`always` `pnpm --filter stack build` `npx wrangler pages deploy stack.slyxup.online/out --project-name=stack-slyxup-online`) `deploy-billing` (`if: billing/`) — `stack` Pages `active` `https://f4107250.stack-slyxup-online.pages.dev` + custom `stack.slyxup.online` `200`, `auth` Workers `auth.slyxup.online/*` `cfa91e79` `99d2ebe4` `Version 85705a4e`.
* `3. Release — NPM Publish (Changesets)` `release.yml` `on: push main` `concurrency: release` `if: github.repository == 'slyxup/stack'` `permissions: contents: write, pull-requests: write, id-token: write` → `pnpm install` `pnpm build` `changesets/action@v1` `publish: pnpm changeset publish` `version: pnpm changeset version` `env: GITHUB_TOKEN+NPM_TOKEN` `access: public` (fixed from `restricted`) → `0.1.0` `core` `react` `nextjs` `ui` `cli` `billing 0.1.1` published `https://www.npmjs.com/package/@slyxup/core` `repository: github.com/slyxup/stack` `publishConfig public`.

**Not duplicate — 47 runs because each `push` triggers 3 workflows + `PR #1` `chore: version packages` `changeset-release/main` triggers `CI` again (`CI #17: Pull request #1 synchronize by github-actions Bot` `action_required` → now `success` after `can_approve_pull_request_reviews: true`).**

**Tokens (`gh secret list`):** `CLOUDFLARE_API_TOKEN 09:29:23Z` (10 perms: `Workers Scripts/KV/R2/D1 Edit` `Cloudflare Pages Edit` `Zone Read` `Workers Routes Edit` `User Details/Memberships Read` `Account Settings Read`), `CLOUDFLARE_ACCOUNT_ID ed01399a...` `NPM_TOKEN npm_Ft2e...` `09:29:23Z` `npm whoami slyxup` `publishConfig public`.

**Branch protection:** `main` requires `1. CI — Verify` green, `gh api repos/slyxup/stack/branches/main/protection` `required_status_checks: ci` `strict:true`.

---

## 16. Observability — Logs, Metrics, Alerts

* `wrangler.jsonc` `observability: {enabled:true, head_sampling_rate:1}` for V1 (100% logs), `Pino` JSON structured `{"level":"info","service":"auth","path":"/v1/auth/sign-in","userId":"..."}` → `wrangler tail` `https://dash.cloudflare.com/.../workers` `Logs` `Metrics` `Invocations` `Errors` `Duration` `CPU`
* `KV` `rate_limits` `audit_logs` (V1.1) `D1` `size_after` `rows_read` `duration` `served_by` `APAC` `SIN`.
* Alerts: `wrangler` `tail` + `sentry` (future) for `500` `D1_ERROR`.

---

## 17. Performance, Scale & Cost

**D1:** `10GB` paid `500MB` free `size_after 36864` for `users` `49` cmds, `100` bound params `floor(100/cols)` batch, `single-threaded` Durable Object `6` conns/worker `30s` max query, `R2` for >2MB blobs.

**Workers:** `128MB` RAM `50ms` free CPU `30s` paid, `wrangler deploy` `83.78 KiB gzip 19.96 KiB` `Worker Startup 12ms`, `KV` `25MB` value `eventual`, `R2` `10GB` free.

**Scale:** `auth` single D1 writer sufficient for V1 `~1k` rps, `sessions` `7d` TTL `KV` cache, `Pages` `stack` `99.2 kB` `4/4` static `edge cache`.

**Cost (CF free tier V1):** `Workers` `100k` req/day free, `D1` `5GB` free, `KV` `1GB` `100k` reads, `Pages` `500` builds, `R2` `10GB` — hosted `auth.slyxup.online` free, self-host `wrangler dev --local` free.

---

## 18. Timeline — 10 Phases, 8 Weeks, Gantt

| Phase | Name | Duration | Owner | Deliverable | Exit Criteria | Depends On |
|---|---|---|---|---|---|---|
| **0** | Setup | 1d **DONE** `fbbbb02` | AI | `slyxup.online/stack/` `wrangler.jsonc` `drizzle.config.ts` `biome` `husky` `pnpm` `turbo` `changesets` `ci.yml` | `git log` `pnpm build` `wrangler whoami` | — |
| **1** | **DB & Schema** | 2d **DONE** `f51ac15` | AI | `src/lib/schema.ts` 11 tables `0001_square_sally_floyd.sql` `cfa91e79` `5c5a0f61` `11 tables` | `pnpm db:migrate:local+remote` `11 tables` `pnpm typecheck` | 0 |
| **2** | API Contract | 1w **IN PROGRESS** `feat/api-contract` `5277589` | AI | `schemas/auth.ts` `users.ts` `services/auth.service.ts` `routes/auth.ts` `middleware` `src/index.ts` `/v1/*` | `app.request('/v1/auth/sign-up') 201` `Set-Cookie` | 1 |
| **3** | Core SDK | 1w | AI | `packages/core` `client.ts` `auth.ts` `sessions.ts` `users.ts` `SlyxupClient` `publishConfig public` |
| **4** | React SDK | 3d | AI | `packages/react` `SlyxUpProvider` `useAuth/useUser/useSession` `jsx: react-jsx` | `pnpm --filter @slyxup/react build` |
| **5** | Next.js SDK | 3d | AI | `packages/nextjs` `server/current-user.ts` `middleware.ts` `cookies.ts` | `currentUser()` `slyxupMiddleware()` |
| **6** | UI | 1w | AI | `packages/ui` `SignIn/SignUp/UserButton/...` `shadcn` `tailwind v4` | `pnpm --filter @slyxup/ui build` |
| **7** | CLI | 1w | AI | `packages/cli` `login, init, project, keys, env, doctor` `detectors` `generators` | `slyxup init` in `test-app` |
| **8** | Marketing | 3d | AI | `stack.slyxup.online/app/*` `out/` `Pages` `f4107250` `stack.slyxup.online` `200` | `next build` `wrangler pages deploy` |
| **9** | CI/Release | 2d | AI | `ci.yml` `deploy.yml` `release.yml` `changeset` `NPM_TOKEN` `CLOUDFLARE_API_TOKEN` | `gh run list` `3 SUCCESS` `npm view` `curl` |

**Critical Path:** `1 → 2 → 3 → 4 → 5 → 6 → 7` sequential (each `pnpm build` depends on previous), `8` parallel with `7`, `9` throughout. **Total 8 weeks** (1d+2d+1w+1w+3d+3d+1w+1w+3d+2d).

**Milestones:**
* M1 (week 1): `DB` `11 tables` `migrate` ✅ `f51ac15`
* M2 (week 2): `API` `POST /v1/auth/sign-up` `200` `Set-Cookie`
* M3 (week 4): `core` `react` `nextjs` `npm view @slyxup/core 0.1.1`
* M4 (week 6): `ui` `cli` `slyxup init` in `test-app`
* M5 (week 8): `stack` `200` `auth` `200` `cli` `0.1.x` `1.0.0` RC

---

## 19. Risks, Mitigations & ADRs

| Risk | Prob | Impact | Mitigation | ADR |
|---|---|---|---|---|
| D1 100 params batch overflow | High | Data loss | `BATCH_SIZE = floor(100/cols)` helper, tested in `tests/integration` | `001-cf-workers-d1` |
| FK always ON breaks migration | Med | Migration fail | `onDelete: cascade` explicit, `PRAGMA defer_foreign_keys` for circular, `0 rows` so `NOT NULL` ok | `d1-specifics.md` |
| `Math.random()` for tokens | High | Security | `crypto.randomUUID()` `crypto.getRandomValues()` `timingSafeEqual` enforced via `biome` | `TECH_STACK.md` |
| OAuth state CSRF | Med | Hijack | `state` `crypto.randomUUID()` `KV` `PKCE` `timingSafeEqual` | `PLAN.md:21` |
| Brevo `noreply` not verified | Med | Mail 500 | `brevo1/2._domainkey DNS only` `DMARC` `MX` verified `dig` `active` | `ENV_GUIDE.md` |
| `wrangler deploy` `10000` `zone/routes` | High | Deploy fail | `CLOUDFLARE_API_TOKEN` 10 perms: `Workers Scripts/KV/R2/D1 Edit` `Pages Edit` `Zone Read` `Workers Routes Edit` `User Details/Memberships Read` | `09:29:23Z` fix |
| `GITHUB_TOKEN` `can_approve` false | High | Release PR `action_required` | `gh api PUT .../permissions/workflow {"can_approve_pull_request_reviews":true}` | `10:02:45Z` fix |
| `NPM_TOKEN` `restricted` | High | `E404` publish fail | `.changeset/config.json` `access: public` + `publishConfig public` + `NPM_TOKEN npm_Ft2e...` `npm whoami slyxup` | `07:57:12Z` fix |
| `stack` Pages `404` | Med | Marketing 404 | `next.config.mjs` `output: export` → `out/` `wrangler pages deploy out` `81 files` `f4107250` `200` | `17:20` fix |
| `auth` DNS `NXDOMAIN` | Med | Custom domain `auth.slyxup.online` fail | `Workers Routes auth.slyxup.online/*` `success` + `A 192.0.2.1 Proxied` DNS `dig` `104.21...` | `17:10` fix |
| `next 15.0.0` vs `opennextjs 1.20.2` peer | Low | Build fail | Keep `15.0.0` with `wrangler deploy` `assets: .next` (Pages `out` for `stack` is static, no `opennext`) | `pnpm list` warn ignored |

**ADRs `docs/adr/`:**
* `001-cf-workers-d1.md:1` `CF Workers + D1 (CF Only)` `2025-08-24` — `wrangler.jsonc` `d1_databases` `kv_namespaces` `r2_buckets` vs `docker-compose.yml`.
* `002-billing-placeholder.md` (future) — `billing.slyxup.online` Worker placeholder, `slyxup_billing 5c5a0f61`.
* `003-brevo-email.md` (future) — `BREVO_API_KEY xsmtpsib-...` `noreply@slyxup.online` vs `Resend` `SES`.

---

## 20. How to Use This Plan (AI + Human Checklist)

**Before ANY `feat/` branch (AI + you):**
- [ ] `ROADMAP.md` next phase identified? (now `2 API Contract` `feat/api-contract`)
- [ ] `AGENTS.md §2` build order followed? (`1 DB` done `f51ac15`, now `2 API`)
- [ ] `TECH_STACK.md` `DRIZZLE_GUIDE.md` `ENV_GUIDE.md` read?
- [ ] `LIMITATIONS.md` checked? (no Dashboard/Billing beyond placeholder)
- [ ] `gh issue create --title "feat(auth): ..." --label feat` with checklist `## Plan: ...` (template above)?
- [ ] `pnpm install` done, `wrangler types` run, `auth.slyxup.online/.dev.vars` has `SESSION_SECRET` `BREVO_API_KEY` `GOOGLE_DEV` `GITHUB_DEV` (local), `wrangler secret list` has `PROD` `GOOGLE o1rel` `GITHUB Ov23liAP` `BREVO`?

**Per Commit (Husky runs):**
```bash
pnpm typecheck && pnpm lint && pnpm build # 7/7
# if schema: pnpm --filter auth db:generate → db:migrate:local+remote → git add schema.ts migrations/
pnpm cf:typegen # after wrangler.jsonc change
git add -p && git commit -m "feat(auth): add sign-up route" # commitlint
git push -u origin feat/api-contract # gh pr create --fill --label feat
```

**Dev → Prod (only when you say `push to main`):**
```bash
# Dev: feat/api-contract pe verify
pnpm --filter auth dev # wrangler dev :8789 http://localhost:8789/v1/health 200
curl -X POST http://localhost:8789/v1/auth/sign-up -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"12345678"}' # 201 Set-Cookie
pnpm --filter @slyxup/core exec npm publish --dry-run --access public
# Prod: you say "push" → git checkout main && git merge feat/api-contract && git push origin main
# → CI 1. CI — Verify 2m24s SUCCESS → Release 49s SUCCESS (chore: version packages PR) → Deploy 53s SUCCESS (auth Worker + stack Pages)
# Verify prod: gh run list --limit 3 | grep success; npm view @slyxup/core version; curl https://auth-slyxup-online.slyxup.workers.dev/health
```

**Never take anything lightly — every file must be `biome` formatted, `tsc` strict, `D1` correct (`integer boolean/timestamp`, `100` params), `wrangler` bound (`env.DB` `env.KV` `ctx.waitUntil`), `crypto.randomUUID()` (never `Math.random()`), `wrangler secret put` (never commit `.dev.vars`).**

---
**This plan is FOLLOWED — build in order, one PR per phase, `pnpm typecheck && pnpm build` green before next. Start Phase 2 now on `feat/api-contract`.**
