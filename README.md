# SlyxUp Stack — CF Workers + D1 (github.com/slyxup/stack)

> **Monorepo: `slyxup.online/stack/`** — domain-based, CF-only. Root `slyxup.online/` has no git.

```
slyxup.online/stack/               ← monorepo (here, pnpm + wrangler)
├── auth.slyxup.online/  → https://auth.slyxup.online (Hono Worker + D1 + KV)
├── stack.slyxup.online/ → https://stack.slyxup.online (Next.js Pages)
├── billing.slyxup.online/ → future Worker
└── packages/{core,react,nextjs,ui,cli,billing}
```

## AI Agent — Start Here

Read in order before coding:

1. **`AGENTS.md`** — build order, what to make/NOT, how to work (READ FIRST)
2. **`TECH_STACK.md`** — CF Workers, D1 limits (100 params, BOOLEAN etc.)
3. **`DRIZZLE_GUIDE.md`** — `pnpm db:generate` → `db:migrate:local` → `db:migrate:remote` on EVERY schema change
4. **`ENV_GUIDE.md`** — `.dev.vars` + `wrangler secret put`, dev/prod parity
5. **`LIMITATIONS.md`** — what AI must not bypass
6. **`STRUCTURE.md`** — deploy mapping + tree
7. **`PLAN.md`** — full product spec (1507 lines)

## Quick Start (CF)

```bash
cd slyxup.online/stack
pnpm install
cp .env.example auth.slyxup.online/.dev.vars  # fill local secrets
wrangler d1 create slyxup_auth --local
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local
pnpm --filter auth.slyxup.online dev  # wrangler dev
```

Deploy: `pnpm --filter auth.slyxup.online deploy` (needs `wrangler secret put`)

All MDs are for AI — no Docker, only `wrangler`.
