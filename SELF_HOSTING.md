# Self-Hosting SlyxUp Stack

Run your own SlyxUp instance on your Cloudflare account. No code changes needed —
every deployment value comes from `wrangler.jsonc` `vars` + Worker secrets.

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Auth Worker │  │Billing Wrkr │  │  Web (Pages)│
│ Hono + D1   │  │Hono + D1    │  │ Vite + React│
│ /v1/*       │  │/v1/*        │  │ /admin,/docs│
└──────┬──────┘  └──────┬──────┘  └─────────────┘
       │ D1             │ D1 (separate)
  slyxup_auth     slyxup_billing
```

Billing is a **separate Worker + separate D1**. Never merge billing tables into auth.

## Prerequisites

- Cloudflare account + `wrangler login`
- Node 20+, pnpm 9+
- (Optional) Paddle account for billing, OAuth apps for Google/GitHub

## 1. Clone & install

```bash
git clone https://github.com/slyxup/stack.git
cd stack
corepack enable && pnpm install
```

## 2. Create D1 + KV on YOUR account

```bash
wrangler d1 create slyxup-auth
wrangler d1 create slyxup-billing
wrangler kv:namespace create slyxup-cache
```

Put the returned `database_id`s into `auth/wrangler.jsonc` and
`billing/wrangler.jsonc` (`d1_databases`) and the KV `id` into `kv_namespaces`.

## 3. Configure public vars

In each `wrangler.jsonc` → `vars`:

| Var | Auth example | Billing example |
|-----|--------------|-----------------|
| `APP_URL` | `https://app.example.com` | same |
| `API_URL` / `AUTH_URL` | `https://auth.example.com` | `AUTH_URL=https://auth.example.com` |
| `CORS_ORIGINS` | `https://app.example.com` | same |
| `ALLOWED_REDIRECT_ORIGINS` | `https://app.example.com` | — |
| `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` | your OAuth IDs | — |

Or run the helper: `./scripts/setup-self-hosted.sh` (copies configs, prompts for URLs).

## 4. Secrets (never in git)

```bash
./scripts/setup-secrets.sh local        # dev: gitignored .dev.vars
./scripts/setup-secrets.sh production   # deploy: `wrangler secret put`
```

Required: `SESSION_SECRET`, `ENCRYPTION_KEY` (auth), Paddle keys (billing).
Optional: `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, email provider key.

## 5. Migrate & deploy

```bash
pnpm --filter auth db:migrate:local && pnpm --filter auth db:migrate:remote
pnpm --filter billing db:migrate:local && pnpm --filter billing db:migrate:remote
pnpm --filter auth deploy
pnpm --filter billing deploy
```

Frontend:

```bash
VITE_AUTH_API_URL=https://auth.example.com \
VITE_BILLING_API_URL=https://billing.example.com \
pnpm --filter web build && pnpm --filter web deploy
```

SDK users point at your instance:

```ts
import { SlyxupClient } from '@slyxup/core';
const client = new SlyxupClient({
  publishableKey: 'pk_...',
  apiUrl: 'https://auth.example.com', // ← your Auth Worker
});
```

## 6. Verify

```bash
curl https://auth.example.com/v1/health
curl https://billing.example.com/v1/health
```

See `DEPLOYMENT_CHECKLIST.md` (pre-flight) and `TROUBLESHOOTING.md` (errors).
