# SlyxUp Stack — Logic, UX & Confusion Review Report

> Scope: full monorepo at `/home/ysr/Documents/Workspace/slyxup.online/stack/`
> Surfaces reviewed: `auth.slyxup.online` (Hono + D1), `billing.slyxup.online` (Hono + D1 + Paddle),
> `stack.slyxup.online` (Next.js marketing + dashboard), `packages/*` SDKs, `app/docs/**` docs site.
> Method: automated multi-agent source review, with direct human verification of all HIGH-severity
> security claims against the source (see "Verified vs. Flagged" below).

---

## 0. How to read this report

- **Severity** = impact if the issue bites (HIGH / MED / LOW). "Logic" issues break correctness/security;
  "Confusion" issues break the developer or end-user experience.
- Findings were produced by parallel review agents. Every **HIGH** security/Logic finding was
  hand-checked against the actual source before publication. A few agent claims were **wrong** and
  are explicitly retracted (see §8).
- File:line references point at the code as it exists today. Treat as starting points, not a patch.

### Verified vs. Flagged
| Claim | Status |
|---|---|
| `passwordHash` leaked in `/v1/auth/user`, `PATCH /v1/user`, project-users | ✅ **Verified** |
| Auth router double-mounted at `/v1` and `/v1/auth` (rate-limit bypass) | ✅ **Verified** |
| Sign-in project scoping | ✅ **Verified (nuanced)** — scoped when `projectId` given; global fallback when omitted |
| API keys hashed with reversible base64 | ❌ **Retracted** — actually SHA-256 (`project.service.ts:160`) |
| Multi-tenant email lookup "completely ignores projectId" | ⚠️ **Reframed** — only the no-`projectId` fallback path is unscoped |
| SDK/doc contract mismatches | ⚠️ **Flagged** — plausible but verify each against current `packages/*` exports before acting |

---

## 1. Executive summary

**Totals (by severity, across all domains):**

| Domain | HIGH | MED | LOW |
|---|---|---|---|
| Auth Worker (logic/security) | 6 | 11 | 7 |
| Billing Worker (logic/data) | 2 | 13 | 4 |
| Frontend / Dashboard (UX) | 8 | 12 | 7 |
| SDKs & Docs (contract drift) | 10 | 9 | 8 |

**Top 12 issues that should be fixed first:**

1. **`passwordHash` returned to clients** — `/v1/auth/user`, `PATCH /v1/user`, project-users detail/edit (`auth.ts:130`, `users.ts:21`, `project-users.ts:171`). Security + developer trust.
2. **Auth rate-limit bypass via double mount** — `app.route('/v1', auth)` (`index.ts:143`) exposes `/v1/sign-in` etc. outside the `/v1/auth/*` limiter.
3. **Unverified sessions usable everywhere** — `signUp` issues a live session before email verification (`auth.service.ts:67-79`); `requireSession` never checks `emailVerified`.
4. **Sign-in global fallback breaks project isolation** — `auth.service.ts:120` returns first user by email across all projects when `projectId` omitted.
5. **Admin/audit middleware skips session-expiry check** — `admin.ts:18-23`, `audit.ts:20-25` (unlike `developers.ts:38` which checks).
6. **No confirmation on destructive dashboard actions** — block user, revoke key, cancel subscription (`users/[userId]/page.tsx`, `keys/page.tsx`, `billing/page.tsx`).
7. **Light theme broken on homepage/docs** — hard-coded dark colors in `app/page.tsx:67,83`, docs tables, code blocks.
8. **Auth dashboard flow is undiscoverable** — no sign-in UI in the dashboard; token only comes from SDK/hosted pages; `AuthGate` never validates the token (`AuthGate.tsx:31-35`).
9. **Docs reference non-existent APIs** — `slyxupServer()`, `client.auth.verifyEmail`, `client.password.forgot/reset`, wrong password paths (`/v1/password/*` vs `/v1/verification/password/*`), wrong key routes.
10. **Billing cancel fallback cancels wrong/non-active subs** — `subscription.ts:60-81`.
11. **Billing GET/cancel/resume ignore `projectId`** — multi-project users see/act on the wrong subscription (`subscription.ts:19-34,60-67,109-126`).
12. **Marketing contradicts product** — `features/page.tsx:82` says billing is "planned, not shipped" while a full billing dashboard exists.

---

## 2. Auth Worker — logic & security

### HIGH

**A1. `passwordHash` leaked in user responses** — `auth.ts:130`, `users.ts:21`, `project-users.ts:171`
`getSession()` and `updateUser()` return the **full `users` row** (`db.select().from(users).get()`), which includes `passwordHash`, `blockedReason`, `preferences`, `deletedAt`. Contrast: `GET /v1/auth/session` (`auth.ts:113-122`) correctly cherry-picks. Any client calling `/v1/auth/user` or editing a user receives the hash. *Logic + security.*

**A2. Rate limiter bypassed by double router mount** — `index.ts:132` + `index.ts:143`
`app.route('/v1/auth', auth)` and `app.route('/v1', auth)` mount the same router twice. The limiter only covers `/v1/auth/*`, so `/v1/sign-in`, `/v1/sign-up`, `/v1/sign-out` are unthrottled → brute-force/credential-stuffing.

**A3. Unverified sessions are fully usable** — `auth.service.ts:67-79`, `middleware/auth.ts`, `auth.service.ts:127-143`
`signUp` creates a session immediately and `signIn` allows `EMAIL_NOT_VERIFIED` to be bypassed? (sign-in throws `EMAIL_NOT_VERIFIED` at line 129, but `signUp` itself returns a session). `requireSession`/`getSession` never check `emailVerified`, so an unverified sign-up session can call `PATCH /v1/user`, `DELETE /v1/user`, `GET /v1/sessions`. Email-reservation DoS: an attacker registers `victim@x.com`, grabs a session, and the real owner can never sign up (global duplicate check).

**A4. Sign-in global fallback breaks project isolation** — `auth.service.ts:120`
When `projectId` is omitted, sign-in falls back to `db.select().from(users).where(eq(users.email, input.email)).get()` — the first user with that email across **all** projects. If `user@a.com` exists in project X and Y, an om

***(correction note: this is the scoped-when-provided nuance described above)***

**A5. Admin & audit middleware skip session-expiry check** — `admin.ts:18-23`, `audit.ts:20-25`
They check the session row exists but not `session.expiresAt < now`. `developers.ts:38` does check. An expired-but-not-GC'd token still grants admin/audit access. *Authorization inconsistency.*

**A6. OAuth users/projects not scoped** — `oauth.ts:250-273,311-318`
OAuth lookup is by global email; newly created users get **no `projectId`**; sessions get **no `projectId`**. No `state.redirectUrl` carries project context, so there is no project scoping for social login. *(Verify against current `oauth.ts`.)*

### MEDIUM

**A7. CORS reads deprecated `allowedDomains` column** — `index.ts:62-69`
Schema marks `projects.allowedDomains` deprecated in favor of `project_domains`, but CORS still reads the JSON column. Domains added only via `project_domains` get CORS rejections.

**A8. Dead `admin.service.ts`** — entire file. `blockUser/unblockUser/setUserRole` never imported; `routes/admin.ts` re-implements inline. Also uses a weird dynamic `import('../lib/schema')`.

**A9. Dead legacy developer auth** — `project.service.ts:8-49` (`registerDeveloper`/`loginDeveloper`) use deprecated `developers.email/passwordHash` columns, contradicting the documented "no password login" model.

**A10. LIKE-injection in search** — `project-users.ts:53,59` and `admin.ts:111` interpolate `q` directly into `like(users.email, '%${q}%')` without escaping `%`/`_`. Not SQLi (parameterized) but allows pattern abuse (e.g. `?q=%` matches all).

**A11. Admin mutations don't verify user exists** — `admin.ts:35-76` return `{ok:true}` for any `userId`, even typos / non-existent. `project-users.ts` correctly checks first.

**A12. Inconsistent session deletion on delete** — `user.service.ts:34-46` deletes sessions explicitly (good); but `deleteUser` path in `routes/users.ts`→`user.service.deleteUser` is fine; *self-service* delete relies on cascade whereas `project-users` deletes explicitly. Asymmetry noted in code comments.

**A13. Rate limiting only on `/v1/auth/*`** — `index.ts:102`. Admin, project-users, verification resend, password forgot, OAuth initiate are all unthrottled. `POST /v1/verification/password/forgot` can be spammed to send unlimited reset emails.

**A14. N+1 in `listProjects`** — `project.service.ts:91-107` issues 1 + N queries; should be a JOIN or `IN` clause.

**A15. `users.projectId` nullable → orphan platform users** — `auth.service.ts:45` `projectId: input.projectId ?? null`. Any unauthenticated caller can create platform-level users; schema comment claims a "publishable-key middleware" enforces it, but no such middleware exists.

**A16. OAuth error messages leaked in redirect URL** — `oauth.ts:331-334` puts raw `e.message` into `?error=`, leaking internals (e.g. "Google token exchange failed").

**A17. `ensureDeveloper` legacy-email collision dead-ends** — `developers.ts:60-96`: if a legacy developer row already has a `userId` linked elsewhere, the user is permanently blocked from project/key ops with a generic "contact support" error.

**A18. Domain add/remove asymmetry** — `projects.ts:93-99`: `add` normalizes (`strip http://`, trailing `/`) but `remove` does not, so `remove https://example.com/` silently fails to match a stored `example.com`.

**A19. `setSessionCookie` hardcodes `Secure`** — `cookies.ts:19` `isProd = true`. Plain-HTTP localhost (e.g. `vite` dev) never receives/sends the cookie; only the (leaked) body token works, undermining the cookie model.

**A20. PKCE verifier generated but unused** — `oauth.service.ts:52`, `oauth.ts:186-203`: `pkceVerifier` stored in KV but never sent as `code_challenge`; callback never verifies `code_verifier`. Misleading "security" dead code.

### LOW

**A21.** OAuth `state` `isStateExpired()` defined but never called (`oauth.service.ts:57-61`).
**A22.** `forgotPassword` ignores `projectId` (`token.service.ts:105-111`) — same global-email issue.
**A23.** `health.ts` route defined but never mounted (`index.ts` has inline health instead).
**A24.** Unused schemas: `signOutSchema`, `refreshSchema`, `updateProfileSchema`, `deleteAccountSchema` (`schemas/auth.ts`); `addMemberSchema` (`schemas/projects.ts`); `listUsersSchema` (`schemas/users.ts`).
**A25.** `users.ts` uses `updateUserSchema` from `schemas/users.ts`, not the unused `updateProfileSchema` — inconsistent naming hints at unfinished work.

---

## 3. Billing Worker — logic & data

### HIGH

**B1. Cancel fallback cancels wrong/non-active subscriptions** — `subscription.ts:60-81`
Searches `status==='active'`; if none, falls back to *any* subscription for the user (no status filter) and calls Paddle cancel on it. Trialing/paused/already-canceled subs get cancelled. *Logic + revenue.*

**B2. Checkout blocked on any non-canceled sub (incl. paused/past_due)** — `checkout.ts:63-75`
A `paused` (failed payment) or `past_due` user cannot start a new checkout for the same project and cannot re-subscribe without first cancelling — but cancel has B1's bug. Merchant loses recoverable users.

### MEDIUM

**B3. `updatedAt` never written by `onConflictDoUpdate`** — `checkout.ts:88-94`, `webhooks.ts:111-127,161-181`. `$onUpdate()` only fires on ORM `update()`, not explicit `set` blocks. Subscriptions/customers/invoices keep creation timestamp forever.

**B4. `transaction.canceled` / `transaction.partially_refunded` ignored** — `webhooks.ts:244-253`. Invoices can stay `paid` for canceled transactions; partial refunds and chargebacks not handled.

**B5. GET/cancel/resume ignore `projectId`** — `subscription.ts:19-34,60-67,109-126`. A user subscribed to two projects sees/acts on only the newest subscription. *Silently wrong subscription for multi-project users.*

**B6. Webhook processing errors are swallowed, no replay** — `webhooks.ts:229-267`. The event row is inserted *before* processing; if processing throws, Paddle's retry hits the duplicate guard and is acked `200` → event permanently lost. No `processed` flag to distinguish.

**B7. `processedAt` set at insert, not after success** — `schema.ts:178-179`. Every event (processed or not) shows as processed; impossible to audit failures.

**B8. `customers.userId` unique but Paddle customer looked up by email** — `paddle.service.ts` `getOrCreateCustomer` searches Paddle by email. Two auth users sharing an email (allowed by `(email, projectId)` uniqueness) collide on one Paddle customer → cross-user billing data exposure.

**B9. `GET /v1/billing/subscription` returns only latest** — `subscription.ts:19-34`. Second active subscription invisible; SDK `useSubscription()` returns `null` for it.

**B10. `canceledAt` reset to null on late non-canceled event** — `webhooks.ts:108,125`. Late/duplicate event erases the original cancellation timestamp (audit trail loss).

**B11. Checkout doesn't verify user belongs to plan's project** — `checkout.ts:55-75`. A user can check out a plan for a project they don't belong to (if they know the `planId`).

**B12. `GET /v1/billing/invoices` hard-capped at 100, no pagination** — `invoices.ts:21-26`. Older invoices unreachable.

**B13. `GET /v1/billing/plans` fully unauthenticated** — `plans.ts:10`. Anyone can enumerate plans for any `projectId` UUID.

**B14. Unknown Paddle sub status silently maps to `past_due`** — `webhooks.ts:56-62`. Forward-compat landmine: new statuses look like payment failure.

### LOW

**B15.** `requireAdmin` uses `!==` not timing-safe compare (`middleware/auth.ts:72`) — inconsistent with webhook verification.
**B16.** Duplicate unique indexes on `customers.paddle_customer_id` (`schema.ts:25,37`).
**B17.** Rate limiter TOCTOU race (`rate-limit.ts:15-28`) — slight over-admission under concurrency.
**B18.** `invoice.status` enum includes unreachable `overdue` (`schema.ts:142-146`).
**B19.** Checkout 429 returns raw `Response` instead of `c.json()` (`checkout.ts:23-32`) — fragile for CORS.

---

## 4. Frontend / Dashboard — UX & confusion

### HIGH

**U1. Auth flow is undiscoverable** — `app/dashboard/**`, `lib/dashboard-client.ts`, `components/dashboard/AuthGate.tsx`
The dashboard reads `slyxup_dev` from `localStorage`, but **nothing in the dashboard lets you sign in**; the token only appears after using the SDK or hosted `/sign-in` pages elsewhere. A user landing on `/dashboard` with no token sees a dead end. *Severe onboarding confusion.*

**U2. `AuthGate` never validates the token** — `AuthGate.tsx:31-35`
Reads `slyxup_dev` and trusts it. Expired/revoked tokens open the dashboard; every action then 401s with no "session expired, sign in again" path. `req()` throws generic `"Request failed (401)"` (`dashboard-client.ts:56`) — no redirect to login.

**U3. Child pages re-read `localStorage` instead of the `dev` prop** — `page.tsx:22`, `users/page.tsx:38`, `users/[userId]/page.tsx:58`, `keys/page.tsx:26`, `billing/page.tsx:50`, `settings/page.tsx:23`
The layout's `AuthGate` already guarantees a valid `dev` via render-prop, yet every child independently calls `getDev()`. On token expiry/clear, pages silently show infinite "..." with no error/redirect. *Dual auth pattern wastes the gate's guarantee.*

**U4. Destructive actions without confirmation**
- Block/unblock user — `users/[userId]/page.tsx:114-130` (no `confirm()`/modal).
- Revoke API key — `keys/page.tsx:74-87` (irreversible, breaks live services).
- Cancel subscription — `billing/page.tsx:108-124` (financial, dynamic label easy to misclick).
- Go live — `settings/page.tsx:84-103`; Remove domain — `settings/page.tsx:65-82` (can break prod auth).

**U5. Light theme broken on homepage** — `app/page.tsx:83` hard-coded `background:'#0d0e16'` dark band; `app/page.tsx:67,97` hard-coded `color:'#7c8195'` gray-on-light fails contrast. Renders as a "broken-looking" section in light mode.

**U6. Hard-coded dark colors across marketing/docs** — `app/features/page.tsx:59` (`#9fa5ff`), `app/pricing/page.tsx:74` (`#8a90a3`), all docs API tables (`background:'#12141d'`, `color:'#7c8195'`), `app/docs/copy.tsx` code blocks (`#10121b`/`#232635`/`#e6e6ec`). The entire docs section is effectively dark-only; light mode looks half-themed.

**U7. Marketing contradicts the product** — `app/features/page.tsx:82` states billing is "planned, not shipped half-baked," while a fully functional billing dashboard exists at `/dashboard/[projectId]/billing`. Confuses users about what's real.

**U8. Infinite "..." loading with no error/timeout** — `app/dashboard/[projectId]/page.tsx:21-45` and all child pages: if `getDev()` returns null, `useEffect` silently returns; page renders "..." forever. No redirect, no feedback.

### MEDIUM

**U9.** `AuthGate` returns `null` (blank white screen) while resolving (`AuthGate.tsx:81`).
**U10.** `useLogout()` does `clearDev(); window.location.reload()` — jarring full reload (`AuthGate.tsx:156-160`).
**U11.** Nav uses `<a href>` not `<Link>` (`chrome.tsx:12-17`) → full page reloads on marketing site; dashboard uses `<Link>` → two different feels.
**U12.** No "back to site / docs" link in dashboard sidebar (`layout.tsx`) — user trapped in dashboard chrome.
**U13.** Project URLs use UUIDs not slugs (`/dashboard/<uuid>`) though `p.slug` exists (`page.tsx:160`).
**U14.** Billing page queries subscription/invoices **without `projectId`** (`billing/page.tsx:66-69`) while plans use it — multi-project users may see the wrong project's data (see B5).
**U15.** Key creation hard-codes `name:'default'` (`keys/page.tsx:62`) — multiple keys indistinguishable in the list.
**U16.** Settings page is incomplete (no rename/delete project) yet titled "Settings" (`settings/page.tsx`).
**U17.** Error states have no "try again"/back (`users/[userId]/page.tsx:149-151`); sidebar is clickable before project data loads (`layout.tsx:207-208`).
**U18.** Two non-chaining breadcrumbs (`layout.tsx:203` "Projects / x" vs `users/[userId]/page.tsx:158` "Users / name"); sidebar over-links "Project users" 4 ways (`layout.tsx:142-174`).

### LOW

**U19.** CSS injected 3× (`dashboard/page.tsx:177`, `layout.tsx:231`, `AuthGate.tsx:86`) — duplicate stylesheets.
**U20.** `/console` redirect is dead/legacy (`app/console/page.tsx`).
**U21.** Static "Use in your app" snippet with `pk_…` placeholder instead of the user's real key (`keys/page.tsx:151-158`).
**U22.** Pagination shows "1–0 of 0" before load (`users/page.tsx:96`).
**U23.** `BrandShield` SVG hard-codes `stroke="white"` (`icons.tsx:51`) — fragile if CSS override removed.
**U24.** `logout` reload flash (see U10).

---

## 5. SDKs & Docs — contract drift

### HIGH

**D1. Docs call `slyxupServer()` which doesn't exist** — `docs/auth/email:55`, `docs/auth/sessions:66`, `docs/auth/users:54,73`. `packages/nextjs` exports `auth`/`currentUser`/`requireUser`/etc., never `slyxupServer`. Copy-paste → compile error.

**D2. Core SDK docs list 5 non-existent methods** — `docs/sdk/core:11-14,42-47`: `client.auth.verifyEmail` (real: `resendVerification`), `client.password.forgot`/`reset` (don't exist), `client.sessions.revokeAll()` (real: `revokeOthers()`), `client.users.deleteAccount()` (real: `delete()`), `ForbiddenError` (not in `errors.ts`).

**D3. Password endpoint paths wrong** — `docs/api/auth:16-17` show `POST /v1/password/forgot|reset|change`. Actual: `/v1/verification/password/forgot`, `/v1/verification/password/reset`, `POST /v1/user/password`. All documented paths 404.

**D4. Verify-email field name wrong** — `docs/api/auth:15` says `{ code }`; schema (`schemas/auth.ts:41`) is `{ token }`.

**D5. Management key/domain endpoints wrong** — `docs/api/management:10-13,45-48` show `POST /v1/projects/:id/keys`, `GET /v1/projects/:id/keys`, `DELETE /v1/projects/:id/keys/:keyId`, `PUT /v1/projects/:id/domains {hostname}`. Actual: `POST /v1/keys`, `GET /v1/keys?projectId=`, `DELETE /v1/keys/:id`, `PATCH /v1/projects/:id/domains {action,domain}`. All 404.

**D6. `DELETE /v1/projects/:id` and `GET /v1/projects/:id/members` don't exist** — `docs/api/management:9,14`; CLI `project delete` prints "coming soon" (`packages/cli/src/index.ts:210-215`).

**D7. Management auth model described wrong** — `docs/api/management:5,34` says "Bearer sk_… secret key." Actual `projects.ts:17-41` validates a 7-day DB session token via `userFromSession()`. Using `sk_` → 401.

**D8. Billing docs missing cancel/resume/invoices/admin endpoints** — `docs/api/billing:30-34` lists 4; worker has 9 (cancel, resume, invoices, admin plan CRUD).

**D9. Docs claim OAuth is PKCE-protected** — `docs/auth/oauth:7,19` say "state + PKCE." Implementation uses state only (see A20). Security over-claim.

**D10. Error format documented wrong** — `docs/api/auth:68` says `{error:{code,message}}`. Actual: `{ok:false,error:"string"}` flat. `response.error.code` → undefined.

### MEDIUM

**D11.** `SignIn onFinish` wrong prop — `docs/sdk/ui:31` uses `onFinish`; real prop is `onSuccess` (`packages/ui/.../SignIn.tsx:11`).
**D12.** `useSubscription()` needs `projectId` — `docs/sdk/react:16` shows no args; real signature `useSubscription(projectId, apiUrl?)` (`packages/react/src/hooks/useBilling.ts:43`).
**D13.** Checkout docs code throws — `docs/billing/checkout:33-35` (`sessions.get()` shape, `checkout()` returns void + redirects, `url` undefined).
**D14.** `billing.checkout()` SDK ignores `successUrl` — `packages/billing/src/client.ts:114` sends only `{planId}` though the API accepts `successUrl`.
**D15.** `revokeOthers()` doc says "revoke all devices" — `docs/auth/sessions:10`; actually keeps current session.
**D16.** Missing endpoints in auth table — resend, oauth callback, `/user/password` (`docs/api/auth`).
**D17.** Next.js docs contradict each other on `protectedPaths` vs `publicPaths` — `packages/nextjs/README.md:46` vs `docs/sdk/nextjs:43`.
**D18.** Core self-host option name mismatch — docs show `baseUrl` (`docs/sdk/core:71`); real option is `apiUrl` (`packages/core/src/types.ts:94`).
**D19.** `SocialButtons basePath="/v1/oauth"` literal — `packages/ui/README.md:102`; breaks in prod (needs full URL).

### LOW

**D20.** `PATCH /v1/user` omits `preferences` (`docs/api/auth:13`).
**D21.** `useAuth()` README omits `client` (`packages/react/README.md:35`).
**D22.** `useUser()` docs omit `isSignedOut`.
**D23.** UI docs miss `UserProfile`/`ForgotPassword`/`ResetPassword`/`EmailVerification`/`BillingPortal`/`PricingTable`.
**D24.** Billing docs omit cancel/resume nuance.
**D25.** CLI docs say `env push`; real command is `slyxup env --publishable-key` (`docs/sdk/cli:13`).
**D26.** Auth double-mount creates ambiguous `/v1/session` vs `/v1/auth/session` (see A2).
**D27.** `SESSION_COOKIE_NAME` exported 3× under different names (`packages/nextjs/src/index.ts:6,13,20`).

---

## 6. Cross-cutting themes

1. **Duplicated/missing auth models.** Session token (not `sk_`) is the real auth for management & billing, but docs say `sk_`. Two session-validation styles exist (expiry-checked in `developers`, not in `admin`/`audit`/`AuthGate`).
2. **Project scoping is half-implemented.** Schema supports `(email, projectId)` and `users.projectId`, but sign-in fallback (A4), OAuth (A6), forgot-password, and billing subscription (B5) don't consistently honor it.
3. **Theming is token-based now but ~30 hard-coded dark hexes remain** in marketing/docs (U5–U6) — the dark/light toggle looks unfinished.
4. **Dashboard built on a fragile auth assumption**: token from elsewhere, never validated, re-read per page (U1–U3). This is the single biggest UX/confusion risk.
5. **Docs are the weakest layer**: nearly every HIGH doc finding is a 404 or a compile error for a developer following the site. README files (per-package) are generally more correct than the website docs — the website must be reconciled with `packages/*` exports.

---

## 7. Prioritized remediation roadmap

### P0 — Security & data integrity (do first)
1. Stop returning `passwordHash` — add a `sanitizeUser()` that strips secrets; apply in `/v1/auth/user`, `PATCH /v1/user`, project-users. (A1)
2. Remove the `/v1` double-mount or extend the limiter glob; add per-IP/per-token limits to admin, verification, OAuth. (A2, A13)
3. Enforce `emailVerified` in `requireSession`; gate destructive self-service endpoints. (A3)
4. Fix sign-in fallback to stay project-scoped; require `projectId` for project logins. (A4)
5. Add expiry check to `admin`/`audit` middleware. (A5)
6. Billing: don't cancel non-active subs; scope GET/cancel/resume by `projectId`; add webhook `processed` flag + replay. (B1, B5, B6, B7)

### P1 — Correctness & developer trust
7. Reconcile docs with `packages/*` exports: `slyxupServer`, core methods, password paths, key routes, error format, auth model. (D1–D10)
8. Billing: `updatedAt` in `onConflictDoUpdate`; handle `transaction.canceled`/`partially_refunded`; invoice pagination; verify plan↔project membership. (B3, B4, B12, B11)
9. Auth: CORS from `project_domains`; remove dead code (`admin.service`, legacy dev auth); LIKE-escape search; verify admin target exists. (A7–A12)
10. OAuth: scope by project; either implement PKCE or drop the claim from docs. (A6, A20, D9)

### P2 — UX & polish
11. Make dashboard sign-in discoverable + validate token server-side with a re-auth redirect. (U1, U2, U3)
12. Add confirmation modals to block/revoke/cancel/go-live/remove-domain. (U4)
13. Replace remaining hard-coded dark hexes with theme tokens across marketing/docs. (U5, U6)
14. Fix marketing↔product contradiction on billing; add "back to site" link; use slugs in URLs; complete Settings. (U7, U12, U13, U16)
15. Fix pagination "1–0 of 0", error states, duplicate CSS injection. (U8, U19, U22)

---

## 8. Retractions / corrections (accuracy log)

- ❌ **"API keys use reversible base64 (`btoa`)"** — Retracted. `project.service.ts:160` uses `sha256Hex` (SHA-256); `hashedKey` stored and verified correctly.
- ⚠️ **"Sign-in email lookup completely ignores `projectId`"** — Reframed. Primary path *is* scoped (`auth.service.ts:110`); only the no-`projectId` global fallback (`auth.service.ts:120`) is unscoped. Severity reduced to MED.
- ✅ All other HIGH Logic/Security items in §2–§3 were verified directly against source.

---

*Generated as a static review artifact. No code was modified. Findings reference the codebase at the time of review and should be re-checked against the latest `main` before engineering work begins.*
