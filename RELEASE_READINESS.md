# Release readiness — 2026-09-09

## Status

Release candidate: **@slyxup/core 3.0.0 and @slyxup/ui 3.0.0**. Publication is pending the release PR and verified GitHub workflow; local npm authentication returns 401. A GitHub NPM_TOKEN secret exists but its publish validity is not yet verified. Existing consumers require a coordinated major-version migration. This is not a production-security certification.

Docs/UI preview deployed successfully: https://f6c5e6ef.stack-slyxup-online.pages.dev/docs (HTTP 200 verified). Preview alias: https://preview.stack-slyxup-online.pages.dev. This is a web preview, not a deployment of the modified auth/billing Workers.

## Implemented

- Request-scoped server session support, memory-default client tokens, optional project/URL-scoped tab persistence, explicit billing token transport.
- Next.js Request/Response middleware with real session validation, exact public path matching, and fail-closed outage handling; exported `/next` package entry.
- Project-key/session matching on protected auth routes and `/v1/session`.
- Correct multiple Set-Cookie handling and malformed-cookie rejection.
- Project-scoped verification/reset requests, atomic reset-token/recovery-code claims, session revocation on password reset, blocked-user recheck at second-factor completion, and prevention of replacing an enabled second factor without disabling it first.
- Actionable auth/billing error codes, encoded query identifiers, browser secret-key rejection.
- Username sign-in, recovery-code login, persistent errors, unique form IDs, linked billing hooks, invoice retry/error state, currency-separated totals, portal resume action.
- OAuth: verified provider email, project-scoped identity lookup, registered return domains, browser-state binding, provider PKCE, one-time app exchange and second-factor continuation. No new stored provider access tokens and no session tokens in callback URLs.
- Billing ownership-conflict rejection, conservative entitlement expiry/status checks, failed-webhook retry state, rejection of plan/price mismatches and existing-subscription identity reassignment.
- Explicit production billing origins; removed client-controlled test-mode CORS bypass; rejected unapproved-origin mutations.
- Updated Next.js, Drizzle, Hono, Wrangler and vulnerable transitives; pnpm pinned to 10.34.5.
- Correct deployment package filters and CI gating; manual SDK publication using reviewed Changesets versions instead of auto-patch guessing and swallowed failures.
- Source-backed integration guide, public docs rendering/download, corrected fictitious SDK examples and package READMEs.

## Verification evidence

- `pnpm typecheck`, `pnpm lint`, `pnpm test` and all build tasks passed. **132 tests**: core 55, UI 51, auth 14, billing 12. `pnpm test:runtime` also passes real D1 concurrency, OAuth exchange replay, PKCE/browser binding, signed webhook ordering, stale-lease recovery and duplicate delivery. `git diff --check` passed.
- `pnpm audit --prod`: **no known vulnerabilities found** after dependency updates. This is dependency-advisory coverage, not proof of application security.
- Both Worker deployment bundles passed `wrangler deploy --dry-run`.
- `pnpm cf:typegen` generated runtime/binding types locally.
- Auth local pending migration applied successfully.
- Billing's existing local state failed migration because `customers` already existed without matching migration history. A fresh isolated local state at `/tmp/opencode/slyxup-billing-validation` successfully applied both migrations. Existing state was not deleted or re-baselined.
- The first pass was source-only. The release candidate adds generated auth migration 0010 and billing migration 0002; both have passed local application and fresh-runtime migration tests. Deploy workflows apply reviewed remote migrations before uploading each Worker.
- Local workerd smoke tests passed for both health endpoints, malformed-cookie rejection, unauthenticated billing denial and hostile-origin mutation rejection. The newer real-runtime suite tests the implemented OAuth flow.
- Browser docs smoke passed at desktop and mobile sizes, with no horizontal overflow/page errors. Screenshots were captured but the assistant could not visually inspect them through this interface.
- Bundled example browser test passed sign-in, full-page navigation and reload persistence with scoped tab storage. API responses were fixtures; this is consumer wiring coverage, not a real email/Paddle end-to-end test.

## Remaining release blockers

1. **OAuth implementation completed; real-provider acceptance remains.** Project-scoped lookup, browser-bound state, provider PKCE and same-tab app-code exchange are implemented. Exchange/TOTP/state records use D1 atomic consumption. Real provider consent must be checked with configured project domains and accounts.
2. **Webhook reliability implemented; real-Paddle acceptance remains.** Server checkout attribution, provider transaction/customer/price validation, conditional timestamp writes, expired-lease recovery and owner-scoped completion are implemented. Real D1 tests cover out-of-order events, stale leases and concurrent duplicate delivery. Full sandbox purchase/refund/cancel still needs operator acceptance.
3. **One-time auth operations hardened.** Verification tokens, OAuth state/exchange and two-factor challenges use atomic D1 consumption. Password-reset and recovery claims remain atomic. Existing in-flight KV 2FA challenges expire during rollout and users must restart sign-in. Full email delivery is not established by automated tests.
4. **Consumer migration is required.** Inventory consuming platforms, update their lockfiles and transport configuration, and test reload/logout and billing end-to-end. This workspace alone does not identify or update every external consumer.
5. **Auth/billing boundary resolved by owner decision.** The owner chose to keep billing separate. Auth-side billing schemas, DB helper, profile billing reads and `BILLING_DB` binding were removed. Consumers compose billing information through the billing API/hooks. Consumer validation is scoped to the bundled example first.
6. **Local billing state mismatch.** Compare existing local schema with migration SQL before re-baselining; do not drop an existing database just to pass tests.
7. **Server integration is a recipe, not a complete BFF.** Same-origin sign-in/2FA/logout routes, CSRF protection, rate limits and cookie lifecycle need implementation in each server-rendered consumer.
8. **Operational verification remains.** Real Paddle sandbox purchase/refund/cancel, email links, backup/restore, load/rate-limit behavior and all-consumer browser checks are required before a full rollout. Billing is configured for sandbox, not live payments.
9. **Legacy docs and UI remain beyond this pass.** Older reference sections still need a complete contract audit; the new integration guide is the current source-backed starting point. A whole-library visual redesign has not been completed.

## Release procedure

```bash
corepack pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm audit --prod
pnpm --filter auth exec wrangler deploy --dry-run
pnpm --filter billing exec wrangler deploy --dry-run
```

Resolve the blockers, complete the consumer migration and review the major changeset. Version packages with `pnpm exec changeset version`, review resulting manifests/lockfile, then publish through the verified release workflow. Deploy Workers with `pnpm --filter auth deploy` and `pnpm --filter billing deploy`, then `pnpm --filter web deploy`; preserve the previous deployment IDs for rollback. Check `/v1/health` and authenticated flows after rollout. A health response alone does not validate database behavior or payment correctness.
