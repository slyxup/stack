# ROADMAP — SlyxUp Stack Build Plan (Before Build)

> Industry-standard phased plan. AI must complete phases in order, commit per phase, never skip.

## Phase 0 — Setup (DONE, this commit)

- [x] Monorepo `slyxup.online/stack/` domain-based (auth, stack, billing placeholder)
- [x] CF Workers + D1 + KV + R2 (wrangler.jsonc per domain)
- [x] Planning MDs: `AGENTS.md`, `TECH_STACK.md`, `DRIZZLE_GUIDE.md`, `ENV_GUIDE.md`, `LIMITATIONS.md`, `STRUCTURE.md`
- [x] Modern tooling: pnpm + turbo + biome + commitlint + husky + changesets
- [x] Git init + conventional commits + branch protection (planned)
- [ ] Next: Phase 1

## Phase 1 — DB & Schema (Next)

- `auth.slyxup.online/src/lib/schema.ts` — D1 sqliteTable for PLAN.md §8

## Phase 2 — API Contract
## Phase 3 — Core SDK
## Phase 4 — React SDK
## Phase 5 — Nextjs SDK
## Phase 6 — UI
## Phase 7 — CLI
## Phase 8 — Marketing
## Phase 9 — CI/Release

Each phase = one PR, `pnpm typecheck && pnpm build` green before next.
