# SlyxUp Stack — CF Workers + D1 (github.com/slyxup/stack)

> **Monorepo: `slyxup.online/stack/`** — domain-based, CF-only. Root `slyxup.online/` has no git.

```
slyxup.online/stack/               ← monorepo (here, pnpm + wrangler)
├── auth.slyxup.online/  → https://auth.slyxup.online (Hono Worker + D1 + KV)
├── stack.slyxup.online/ → https://stack.slyxup.online (Next.js Pages)
├── billing.slyxup.online/ → future Worker
└── packages/{core,react,nextjs,ui,cli,billing}
```

## AI Agent — Start Here (Read in order)

1. **`AGENTS.md`** — build order db→api→core→react→nextjs→ui→cli, what to make/NOT
2. **`TECH_STACK.md`** — CF Workers, D1 limits (100 params, BOOLEAN etc.)
3. **`DRIZZLE_GUIDE.md`** — `pnpm db:generate → migrate:local → migrate:remote` EVERY schema change
4. **`ENV_GUIDE.md`** — `.dev.vars` + `wrangler secret put`, dev/prod parity
5. **`PLANNING.md`** — how to work with proper planning (issue → design → implement → test)
6. **`WORKFLOW.md`** — branching, conventional commits, husky, changesets, CI
7. **`LIMITATIONS.md`** — what AI must not bypass
8. **`STRUCTURE.md`** + **`ROADMAP.md`** + **`PLAN.md`** (1507 lines product spec)

## Industry Standard — Modern

- **Conventional commits** + `commitlint` + `husky` + `lint-staged` (biome)
- **Biome** format & lint, `tsc strict`, `turbo` + `changesets` versioning
- **Branch protection** `main` requires `ci.yml` green, no direct push
- **Drizzle** `sqliteTable` + `wrangler d1 migrations apply` both envs, `wrangler types`
- **Security** `CODEQL`, `SECURITY.md`, `wrangler secret put` only

## Quick Start (CF)

```bash
cd slyxup.online/stack
pnpm install
cp .env.example auth.slyxup.online/.dev.vars
wrangler d1 create slyxup_auth --local # → update wrangler.jsonc database_id
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local
pnpm --filter auth.slyxup.online dev  # wrangler dev
```

Deploy: `pnpm --filter auth.slyxup.online deploy`

See `CONTRIBUTING.md`, `PLANNING.md`, `WORKFLOW.md`.
