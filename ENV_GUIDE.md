# Environment and deployment guide

## Actual workspace layout

| Folder / pnpm filter | Runtime | Local URL |
| --- | --- | --- |
| `auth` | Hono Cloudflare Worker, D1/KV/R2 | `http://localhost:8787` |
| `billing` | Hono Cloudflare Worker, separate billing D1; `AUTH_DB` read access | `http://localhost:8788` |
| `web` | Vite/React, Cloudflare Worker Static Assets | `http://localhost:5173` |

Public hostnames are deployment targets, not directory/package names. Use `pnpm --filter auth`, never `pnpm --filter auth.slyxup.com`.

## Public configuration versus secrets

- Worker bindings and non-secret vars live in each service's `wrangler.jsonc`.
- Local secrets/overrides go in that service's gitignored `.dev.vars`.
- Production secrets are set through `pnpm --filter auth exec wrangler secret put NAME` (or `billing`). Verify secret **names** with `wrangler secret list`; do not print values.
- Browser variables are public. Vite substitutes `import.meta.env.VITE_*`. Pass values explicitly to package constructors/providers. Never put `sk_*`, Paddle API keys, webhook secrets or bootstrap tokens in browser variables.
- Wrangler vars are deployment configuration. Vite public values must be present **at build time**; Pages runtime vars do not rewrite a built JavaScript bundle.

Auth configuration includes `APP_URL`, `API_URL`, `HOSTED_AUTH_URL`, `CORS_ORIGINS`, `ALLOWED_REDIRECT_ORIGINS`, OAuth client IDs and email sender settings. Relevant secrets include `SESSION_SECRET`, `ENCRYPTION_KEY`, OAuth client secrets and the configured email provider key. See `.env.example` and `auth/src/lib/better-auth.ts` for exact current requirements.

Billing API calls use `https://billing-slyxup-com.billing-86c.workers.dev`, while Paddle checkout uses the permanent approved page `https://stack.slyxup.com/pay`; the Stack Worker proxies that page and its billing config request to Billing. Project `environment=test` selects Paddle Sandbox; project `environment=live` selects Paddle Production. Configure `PADDLE_SANDBOX_API_KEY`, `PADDLE_SANDBOX_CLIENT_TOKEN`, `PADDLE_SANDBOX_WEBHOOK_SECRET`, `PADDLE_PRODUCTION_API_KEY`, `PADDLE_PRODUCTION_CLIENT_TOKEN`, and `PADDLE_PRODUCTION_WEBHOOK_SECRET` as Worker secrets. API and webhook keys are server secrets; client tokens are only returned by the authenticated mode-aware config endpoint. Paddle Website Approval must include `stack.slyxup.com`, and notifications should use `https://billing-slyxup-com.billing-86c.workers.dev/v1/webhooks/paddle`.

Run `pnpm --filter billing paddle:live` for Paddle Live credentials only. It validates the live API key, stores production secrets through Wrangler, and deploys Billing. It does not ask for SDK/project configuration. Afterward, run `pnpm --filter billing paddle:live:map-price` once to map the Paddle Live `pri_...` price to an existing billing plan.

## Local setup

```bash
corepack pnpm install --frozen-lockfile
# Copy the root template to auth/.dev.vars and fill local-only values.
# Configure billing/.dev.vars separately for billing secrets.
pnpm --filter auth db:migrate:local
pnpm --filter billing db:migrate:local
pnpm cf:typegen
pnpm dev:auth
# Separate terminals:
pnpm dev:billing
pnpm dev:web
```

Set local URL overrides deliberately, for example `AUTH_URL=http://localhost:8787` in billing's `.dev.vars`, and `HOSTED_AUTH_URL=http://localhost:8787` in auth's `.dev.vars` for local email/OAuth links. Set exact app return origins. Local and production should share contracts and binding names, **not accidentally share production destinations**.

Existing registered D1 bindings can be simulated locally; `wrangler d1 create --local` is not a setup step. `wrangler d1 create NAME` provisions a remote database. Each Worker's default local D1 state is separate; billing's HTTP fallback can reach a local auth Worker when its simulated `AUTH_DB` does not contain the auth tables.

The operator website uses `VITE_API_URL` and `VITE_BILLING_URL` (see `web/src/lib/api.ts`). Production consumers should use `https://billing-slyxup-com.billing-86c.workers.dev` for billing; local development uses the local billing Worker port.

## Deployment

First follow `RELEASE_READINESS.md`. Test fresh local migrations, inspect pending remote migrations, review SQL, then apply only intended changes. The 3.0.0 release requires auth migration 0010 and billing migration 0002 before Worker rollout.

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
pnpm audit --prod
pnpm --filter auth exec wrangler deploy --dry-run
pnpm --filter billing exec wrangler deploy --dry-run
# Only when release blockers and consumer migration are resolved:
pnpm --filter auth deploy
pnpm --filter billing deploy
pnpm --filter web deploy
```

Cloudflare auth must target the intended account and resource IDs. New self-hosted installs must provision their own D1/KV/R2 resources and replace the checked-in IDs/routes. Do not deploy a fork against SlyxUp production resources.

For OAuth register exact callback URLs at each provider (`/v1/oauth/callback/google`, `/v1/oauth/callback/github`) and the return hostname on the project. Use SDK 3.0.0's proof-key redirect/exchange, not a hand-built project OAuth URL. A domain/CORS allowlist is never a substitute for authenticated resource authorization.

After deployment, check both health endpoints, real verified-user login, session rejection, consumer origins, email delivery and Paddle sandbox lifecycle. Record deployment IDs for rollback. Production SDK publication is separate from Worker deployment; changing a Worker does not update installed consumer packages.
