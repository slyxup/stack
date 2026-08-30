# SlyxUp SDK — Issues, Fixes & Feature Requests

Exit criteria for this document: every issue below is either fixed and live, or
tracked as an explicit feature request for the next SDK iteration.

## 1. Release matrix (current, 2026-08-30)

| Package    | Version | What changed                                                        |
| ---------- | ------- | ------------------------------------------------------------------- |
| `@slyxup/core`   | 1.2.0   | Enriched user/session types, `bio` on `SlyxupUser`, `UpdateUserInput.bio` |
| `@slyxup/react`  | 1.1.0   | `useTheme` hook (system default), `useAuth().sessionToken`, cached user uses enriched session fields |
| `@slyxup/billing` | 1.0.2  | `getEnvApiUrl()` reads `VITE_SLYXUP_BILLING_URL` explicitly          |
| auth worker  | `c704818a` | Enriched `/v1/session` (`bio`), `PATCH /v1/user` writes `user_profiles.bio` (creates row), `GET /v1/user` returns `bio` |

Consumption note: publishing to the npm registry is currently blocked by an
expired auth token in `~/.npmrc` (401 on `whoami`/`publish`). The Promptly app
consumes the exact published tarballs via `pnpm` workspace links
(`../stack/packages/{core,react,billing}`). To publish for real, refresh the
token (`npm login` or a new `//registry.npmjs.org/:_authToken=...`) and run:

```sh
cd stack/packages/core && pnpm publish --access public --no-git-checks
cd ../react  && pnpm publish --access public --no-git-checks
cd ../billing && pnpm publish --access public --no-git-checks
```

## 2. Issues found (and fixed)

### 2.1 `@slyxup/billing@1.0.0` shipped a stale `dist`
The published 1.0.0 bundle's `getEnvApiUrl()` returned the **auth** URL for
every billing call → `404` on `/v1/billing/*`. Source was already fixed in
1.0.1; 1.0.2 additionally reads `VITE_SLYXUP_BILLING_URL` so Vite apps don't
rely on the auth→billing domain swap. If you pin `@slyxup/billing@1.0.0` you
get the broken dist — always resolve `^1.0.2`.

### 2.2 Session cookie missing `Domain` (cross-subdomain 401)
`api-prompt.slyxup.online`/`auth.slyxup.online` read the same cookie; without
`Domain=.slyxup.online` the cookie was scoped to the auth host and the prompt
API returned 401 for signed-in users. `parentDomain()` in the auth worker now
derives the apex from `Host` (skipped for localhost/IPs).

### 2.3 Two live `/v1/session` handlers
The legacy SDK path mounts `/v1/session` in `src/index.ts` **and** the auth
router exposes `/v1/auth/session`. Both were "session" but only the first was
rate-limit-safe and SDK-consumed. Both endpoints now return the same enriched
shape.

### 2.4 `getSession` requires `emailVerified`
Unverified users get `Invalid session` (401) even with a valid token. This is
intentional friction but invisible: sign-up sets `emailVerified=false` with no
in-app flow. See feature request §3.4.

### 2.5 `user_profiles.bio` defined but never written or returned
Schema had `user_profiles(bio)` (migration 0001) but no worker touched it.
Wired end-to-end:
- `PATCH /v1/user { bio }` → upserts the profile row (created on demand).
- `GET /v1/user`, `/v1/session`, `/v1/auth/session` → include `bio`.
- Prompt backend `resolveSession` fast-path already read `user_profiles.bio`; the
  HTTP fallback now passes `bio` through too, so `/v1/me` returns it in both modes.

### 2.6 Session/auth response types too narrow
`SessionResponse.user` / `AuthResponse.user` were `Pick<User, 'id'|'email'>`.
Widened to include `name`, `username`, `avatarUrl`, `bio` (core 1.2.0).

### 2.7 Session token not exposed to consumers
The core client persists the session token in `localStorage` and sends
`Authorization: Bearer` to custom project APIs, but React consumers had no safe
access. `useAuth().sessionToken` now exposes it (react 1.1.0).

### 2.8 No Vite support for the billing URL
Billing env resolution only checked `process.env` (Next) and then derived from
the auth URL. `VITE_SLYXUP_BILLING_URL` is now read explicitly.

## 3. Feature requests for the next SDK pass

| # | Request | Status | Notes |
| - | ------- | ------ | ----- |
| 3.1 | Theme hook with **system default** | ✅ in 1.1.0 | `useTheme()` → `{ theme, resolvedTheme, setTheme }`; persists `slyxup_theme`; host pages should set `.dark` pre-paint via an inline script. |
| 3.2 | Profile edit API | ✅ server-side | `PATCH /v1/user` accepts `{ firstName, lastName, username, avatarUrl, preferences, bio }`; uniqueness enforced for `username`. |
| 3.3 | User identities on sessions | ✅ | `name`/`username`/`avatarUrl`/`bio` on session endpoints; `SlyxupUser.bio`. |
| 3.4 | Email-verification UX | ⏳ | `resendVerification` + `verifyEmail` exist; missing: elegant "verify to continue" gate and auto re-poll after verification. |
| 3.5 | Avatar upload | ⏳ | No pre-signed URL / R2 endpoint yet; only `avatarUrl` passthrough. |
| 3.6 | Billing webhooks (plan lifecycle) | ⏳ | Workers expose plans/subscriptions; signed webhook events for `subscription.updated` are not wired. |
| 3.7 | Account deletion | ⏳ | `DELETE /v1/user` exists (admin + self); no consumer-facing UI/SDK surface beyond `client.users.delete()`. |
| 3.8 | Republish automation | ⏳ | A `pnpm -r publish` script + CI release step; currently manual per package. |

## 4. Live verification pointers
- `GET https://auth.slyxup.online/v1/session` (Bearer) → includes `bio`.
- `PATCH https://auth.slyxup.online/v1/user { "bio": "..." }` → upserts profile.
- `GET https://api-prompt.slyxup.online/v1/me` → `author.bio` reflects the auth profile.
- `GET https://billing.slyxup.online/v1/billing/plans?projectId=f4cc2309-8aa4-48a6-a540-c27e856961b2` → 200 "Promptly Pro".