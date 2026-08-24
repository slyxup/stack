# PLANNING.md — How to Work with Proper Planning (Industry Standard)

> **Never start coding without a plan.** Every `feat/` branch must have a plan approved (in issue or PR) before `pnpm build`.

## 1. Planning Phases (Required Before Build)

### Phase 0 — Discover (1 day, before code)

- Read `PLAN.md` (product), `AGENTS.md` (build order), `TECH_STACK.md` (limits)
- Write `docs/adr/002-<decision>.md` if new tech choice
- Create GitHub issue: `gh issue create --title "feat(auth): <scope>" --label "feat" --body "Plan: ..."`
- Breakdown tasks in issue checklist (e.g., `- [ ] drizzle schema for sessions`)

### Phase 1 — Design (1 day)

- Design `src/lib/schema.ts` tables + indexes (see `DRIZZLE_GUIDE.md`)
- Design `src/schemas/*.ts` Zod contracts for `src/routes/*`
- Draw `auth → core → react → nextjs → ui` dependency (see `STRUCTURE.md`)
- Review `LIMITATIONS.md` — ensure not building NOT-in-V1

### Phase 2 — Setup Env (0.5 day)

- `wrangler d1 create` → update `wrangler.jsonc` IDs
- `.dev.vars` from `.env.example` + `wrangler secret put` for prod
- Verify dev/prod parity via `ENV_GUIDE.md`

### Phase 3 — Implement (per ROADMAP phase, 1 PR per phase)

- One phase = one PR, ≤300 lines, `pnpm typecheck && pnpm build` green
- Drizzle: `db:generate` → `migrate:local` → `migrate:remote` → commit schema+migration
- Workers: `wrangler types` after binding change

### Phase 4 — Test + Review

- `pnpm test`, `wrangler dev --local` → `curl /v1/health`
- PR checklist from `pull_request_template.md` — all boxes checked
- CI must be green (`ci.yml`: typecheck, lint, build, test, drizzle check)

### Phase 5 — Release

- `pnpm changeset` → version bump → `release.yml` publishes `@slyxup/*`

## 2. Task Breakdown Template (Copy for each feat)

```md
## Plan: feat(auth): add sessions table

- [ ] Drizzle schema: `sessions` table (`sqliteTable`, `integer({mode:'timestamp'})`, `text id`)
- [ ] `pnpm db:generate` + `migrate:local` + verify `SELECT * FROM sessions`
- [ ] `src/services/session.service.ts` — create/verify/revoke
- [ ] `src/routes/sessions.ts` — Hono `GET /v1/session` with `env.DB`
- [ ] `packages/core/src/sessions.ts` — client `getSession()`
- [ ] `wrangler types` + `pnpm typecheck`
- [ ] Tests: `tests/integration/sessions.test.ts`
- Est: 1 day, Risk: D1 100 params batch, Mitigation: batch helper
```

## 3. Modern Industry Standard — What "Not Light" Means

| Practice | Tool | Enforced by |
|----------|------|-------------|
| Conventional commits | `commitlint` + `husky/commit-msg` | Husky |
| Lint & format | `biome` (`biome check --write`) | `husky/pre-commit` + `lint-staged` + `ci.yml` |
| Type safety | `tsc --noEmit` `strict: true` | `ci.yml` |
| Versioning | `changesets` (`pnpm changeset`) | `release.yml` |
| Branch protection | `main` requires CI green | GitHub `branch protection` (see `REMOTE_SETUP.md`) |
| Security | `CODEQL` + `SECURITY.md` + `wrangler secret put` | `ci.yml` security job |
| Env parity | Same `wrangler.jsonc` + `.dev.vars` local / secrets prod | `ENV_GUIDE.md` |
| Migrations | `drizzle-kit generate` + `wrangler d1 migrations apply` both envs | `DRIZZLE_GUIDE.md` + `ci.yml` drizzle check |
| Docs | `AGENTS.md` + `TECH_STACK.md` + ADRs | PR checklist |

If any step skipped, CI fails — that's intentional.

## 4. Drizzle + D1 — Planning Specific

Before ANY schema PR, answer:

- Which tables? (see `PLAN.md` §8)
- Which indexes? (`uniqueIndex` vs `index`)
- FK `onDelete`?
- Batch needed? (`floor(100/cols)`)
- Migration file name? (auto via `drizzle-kit generate`)

## 5. Version Control — Keep Committing

- Small commits: `drizzle(auth): add users table` → `feat(auth): add sign-up route` → not one mega commit
- Push every commit: `git push origin feat/auth-schema` — never stash locally for days
- `git log --oneline` should read like changelog, not `wip` / `fix`
- Use `gh pr create --fill` after push, keep PR ≤400 lines reviewable

## 6. Before Build Checklist (for AI)

- [ ] `ROADMAP.md` next phase identified?
- [ ] `AGENTS.md` build order followed?
- [ ] ADR written if new decision?
- [ ] Issue created with task checklist?
- [ ] `pnpm install` done, `wrangler types` run?

> Do not take anything lightly — every file must be `biome` formatted, `tsc` strict, `D1` correct, `wrangler` bound.
