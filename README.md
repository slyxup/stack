# SlyxUp Stack — CF Workers + D1 (github.com/slyxup/stack)

> **Monorepo: `slyxup.online/stack/`** — domain-based, CF-only. Root `slyxup.online/` has no git.

```
slyxup.online/stack/               ← monorepo (here, pnpm + wrangler)
├── auth.slyxup.online/  → https://auth.slyxup.online (Hono Worker + D1 + KV — identity only)
├── stack.slyxup.online/ → https://stack.slyxup.online (Vite + React 19 + Tailwind v4 • Workers Assets SPA • seeded owner + setup wizard + docs)
├── billing.slyxup.online/ → https://billing.slyxup.online (Hono Worker + D1 — sole owner of billing)
├── examples/  → starter apps
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

## Quick Start — Platform (no DB needed)

```bash
cd slyxup.online/stack/stack.slyxup.online
pnpm install
cp .env.example .env        # optional — defaults to admin@slyxup.local / Admin@123
pnpm dev                    # → http://localhost:5173
# login: admin@slyxup.local / Admin@123 → /change-password → /setup → /dashboard
```

**Full CF (auth + billing) — Dev First**

```bash
cd slyxup.online/stack
pnpm install
cp .env.example auth.slyxup.online/.dev.vars
# wrangler.jsonc me D1/KV IDs already wired (cfa91e79 / 99d2ebe4), naya DB ho to wrangler d1 create
pnpm typecheck && pnpm build
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local
pnpm --filter auth.slyxup.online dev  # wrangler dev localhost:8787
```

Platform deploy (Workers Static Assets):

```bash
pnpm --filter stack.slyxup.online build
pnpm --filter stack.slyxup.online deploy   # or pnpm --filter stack.slyxup.online preview
```

**Dev → Prod Flow (tumhara flow):**
1. **Dev me banao:** `git checkout -b feat/xxx` pe code, `pnpm changeset` (if SDK change), local verify `pnpm typecheck/lint/build` + `wrangler deploy --dry-run` + `npm publish --dry-run`.
2. **Verify karo:** `git diff`, `curl /v1/health`, `wrangler d1 execute --local` — sab sahi lage tab hi aage.
3. **Prod pe push:** `git push origin feat/xxx` → `gh pr create` → CI green → `gh pr merge` → `main` push se `release.yml` (auto SDK version bump **only if** changeset hai, warna no new version) + `deploy.yml` (only auth change pe) trigger. Agar latest hai koi change nahi to **no new deploy** (verified).

Deploy (prod, only on main): `pnpm --filter auth.slyxup.online deploy` (needs `CLOUDFLARE_API_TOKEN`)
Verify prod: `gh run list`, `npm view @slyxup/core version`, `curl https://auth.slyxup.online/v1/health`

See `WORKFLOW.md` §0 (Dev-First Hinglish), `CONTRIBUTING.md` §0, `PLANNING.md` §5.
