# SlyxUp Stack — CF Workers + D1 (github.com/slyxup/stack)

> **Monorepo: `slyxup.com/stack/`** — domain-based, CF-only. Root `slyxup.com/` has no git.

```
slyxup.com/stack               ← monorepo (here, pnpm + wrangler)
├── auth/     → deployed Auth Worker (Hono + D1 + KV)
├── web/      → https://stack.slyxup.com (Vite + React 19, `stack-frontend` Worker)
├── billing/  → deployed Billing Worker (Hono + separate D1 + Paddle)
├── examples/  → starter apps
└── packages/{core,ui}
```

## AI Agent — Start Here (Read in order)

**Integrating with the platform? Start with [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)**, then [core API](packages/core/README.md) and [UI components](packages/ui/README.md). The guide covers the shipped REST API and the two published packages. Check [RELEASE_READINESS.md](RELEASE_READINESS.md) for verification evidence and release blockers.

1. **`AGENTS.md`** — build order db→api→core→ui, what to make/NOT
2. **`TECH_STACK.md`** — CF Workers, D1 limits (100 params, BOOLEAN etc.)
3. **`DRIZZLE_GUIDE.md`** — `pnpm db:generate → migrate:local → migrate:remote` EVERY schema change
4. **`ENV_GUIDE.md`** — `.dev.vars` + `wrangler secret put`, dev/prod parity
5. **`INTEGRATION_GUIDE.md`** — implementation recipes and SDK migration instructions
6. **`WORKFLOW.md`** — branching, conventional commits, husky, changesets, CI
7. **`LIMITATIONS.md`** — what AI must not bypass
8. **`ROADMAP.md`** + **`RELEASE_READINESS.md`** — product direction and verified status

## Industry Standard — Modern

- **Conventional commits** + `commitlint` + `husky` + `lint-staged` (biome)
- **Biome** format & lint, `tsc strict`, `turbo` + `changesets` versioning
- **Branch protection** `main` requires `ci.yml` green, no direct push
- **Drizzle** `sqliteTable` + `wrangler d1 migrations apply` both envs, `wrangler types`
- **Security** `CODEQL`, `SECURITY.md`, `wrangler secret put` only

## Quick Start — Admin web app (real API, no demo data)

```bash
cd slyxup.com/stack/web
corepack pnpm install
cp .env.example .env        # VITE_API_URL → your Auth Worker URL
pnpm dev                    # → http://localhost:5173
# sign in with a real Auth Worker account → /admin
```

> Single source of truth for the first admin: `auth/src/services/bootstrap.service.ts`
> (`POST /v1/setup/bootstrap` claims the admin account while the users table
> is empty; `BOOTSTRAP_ADMIN_EMAIL` in the active
> `auth/wrangler.com-workers-dev.jsonc`). There is no default password.
> Choose the password during bootstrap; passwords are never committed or
> printed by the application.

**Full CF (auth + billing) — Dev First**

```bash
cd slyxup.com/stack
pnpm install
cp .env.example auth/.dev.vars
# The active deployed configs are auth/wrangler.com-workers-dev.jsonc and
# billing/wrangler.com-workers-dev.jsonc. Use your own D1/KV IDs when self-hosting.
pnpm typecheck && pnpm build
pnpm --filter auth db:migrate:local
pnpm --filter billing db:migrate:local
pnpm --filter auth dev  # localhost:8787; run billing separately on 8788
```

Web deployment (Cloudflare Worker Static Assets):

```bash
pnpm --filter web build
pnpm --filter web run deploy
```

**Dev → Prod Flow (tumhara flow):**
1. **Dev me banao:** `git checkout -b feat/xxx` pe code, `pnpm changeset` (if SDK change), local verify `pnpm typecheck/lint/build` + `wrangler deploy --dry-run` + `npm publish --dry-run`.
2. **Verify karo:** `git diff`, `curl /v1/health`, `wrangler d1 execute --local` — sab sahi lage tab hi aage.
3. **Release:** review a changeset, run `pnpm exec changeset version`, and commit the reviewed version/lockfile changes through the normal PR process. Deployment follows successful main-branch CI. SDK publication is a manual verified workflow using committed versions; it never guesses versions or hides publish failures. Breaking session changes need consumer migration before rollout.

Deploy (prod): `pnpm --filter auth deploy` / `pnpm --filter billing deploy` (requires Cloudflare access and the release checks in `RELEASE_READINESS.md`)
Verify prod: `gh run list`, `npm view @slyxup/core version`, and the `/v1/health` endpoints configured in the active Wrangler files.

Use the pnpm version pinned in `package.json` through Corepack. For setup and deployment details, see `ENV_GUIDE.md` and `RELEASE_READINESS.md`.
