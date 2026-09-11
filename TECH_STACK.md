# Current technical stack

| Layer | Implementation |
| --- | --- |
| Auth service | `auth/`: Hono, Cloudflare Workers, Drizzle/D1, KV, R2 |
| Billing service | `billing/`: Hono, separate D1, Paddle Billing; auth validation through `AUTH_DB`/HTTP |
| Web | `web/`: React 19 + Vite + Tailwind v4, deployed to the `stack-frontend` Cloudflare Worker |
| Core SDK | `packages/core/`: TypeScript ESM, typed fetch client, billing client, management helpers, Web API server helpers |
| UI SDK | `packages/ui/`: React 18/19 components, hooks, self-contained stylesheet and theme tokens |
| Example | `examples/url-shortner/`: Next.js 15 static export, client-only SDK usage |
| Tooling | pnpm 10.34.5 (Corepack), Turborepo, TypeScript, Biome, Vitest, Wrangler 4 |

Use `package.json` and `pnpm-lock.yaml` for exact versions. Backend dependency upgrades include Drizzle 0.45.2, current Hono patches and Wrangler 4.130.0. Next.js example is 15.5.25.

## Authentication behavior

The `/v1/*` SDK API is implemented by custom auth routes/services. Better Auth is separately mounted under `/api/auth/*`; do not assume its security properties, plugins or session format automatically apply to `/v1`.

Read `auth/src/lib/password.ts` for the actual custom-route password algorithm; documentation must not label it Argon2id without checking that implementation. Sessions are database-backed random bearer tokens with expiry. Platform login sets host-only HttpOnly cookies; project login returns bearer tokens. SDK tokens are memory-only by default, with explicit project/URL-scoped sessionStorage opt-in. Server consumers should own their HttpOnly cookies through same-origin routes.

Never use browser secret keys, cross-user server-client singletons, `Math.random()` for secrets, or cookie presence as authorization. Full transport and migration recipes: `INTEGRATION_GUIDE.md`.

## Workers and D1 rules

- Access bindings from request `env`; avoid mutable request state in module scope.
- Use Web Crypto for randomness and constant-time cryptographic comparisons.
- Await response-critical work; use `ctx.waitUntil` for post-response work that must finish. Existing floating promises remain review targets.
- Bound bodies before buffering. Validate all external input and enforce ownership server-side.
- Use generated Wrangler binding/runtime types; `pnpm cf:typegen` regenerates them. Some existing code still declares narrower local binding types and needs continued alignment.
- D1 is SQLite. Use Drizzle `sqlite-core`, typed integer booleans/timestamps, text JSON and explicit foreign-key policies. See `DRIZZLE_GUIDE.md`.
- Secrets: service `.dev.vars` locally and Wrangler secrets in production. See `ENV_GUIDE.md`.
- Keep auth and billing data ownership separate. Auth does not bind the billing database; compose profile and billing data in the consumer through their respective APIs.

## Verification limits

Worker unit tests exercise Hono routes/services with mocked storage; `pnpm test:runtime` additionally migrates fresh real local D1 databases and checks challenge concurrency, OAuth exchange replay, signed webhook ordering and lease recovery. Real-provider acceptance and external-consumer rollout remain distinct checks. `pnpm audit --prod` reports known dependency advisories; a clean audit is not an application security certification.
