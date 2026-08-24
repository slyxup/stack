# Contributing to SlyxUp Stack

> `slyxup.online/stack/` — CF Workers + D1, domain-based. Root `slyxup.online/` has no git.

## 1. Modern Workflow (Strict)

### Branching (GitFlow-lite + Conventional)

- `main` — always deployable, protected (no direct push)
- `feat/<domain>-<short>` — e.g., `feat/auth-schema-d1`, `feat/ui-signin`
- `fix/<scope>` — bugfix
- `chore/<scope>` — tooling
- `drizzle/<table>` — schema changes

PR → `main` must pass: `typecheck → lint → test → build` (see `.github/workflows/ci.yml`).

### Commits — Conventional + Commitlint (enforced via Husky)

```
feat(auth): add D1 users table with drizzle sqliteTable
fix(core): handle 100 param batch limit
chore(ci): add biome + commitlint
docs(drizzle): add generate/migrate guide
drizzle(auth): add sessions table, run generate + migrate local+remote
```

Types: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|deps|drizzle`
Husky runs `commitlint --edit` on commit-msg + `lint-staged` (biome) on pre-commit.

### Versioning

- `0.1.0` → `0.2.0` … `1.0.0` after stable (see PLAN.md §28)
- Changesets: `pnpm changeset` → `.changeset/*.md` → `pnpm changeset version` bumps `packages/*` without forcing unrelated
- Publish: `pnpm changeset publish` (via `release.yml`)

## 2. Before You Code — Planning Required

1. Read `AGENTS.md` (build order db→api→core→react→nextjs→ui→cli)
2. Read `TECH_STACK.md` (D1 limits), `DRIZZLE_GUIDE.md`, `ENV_GUIDE.md`
3. Check `LIMITATIONS.md` — don't build Dashboard/Billing beyond placeholder
4. Create issue → discuss → `feat/` branch → plan task list in PR description
5. Do NOT generate entire repo — one phase per PR

## 3. Drizzle + D1 — Proper Workflow (Critical)

Every schema change in `auth.slyxup.online/src/lib/schema.ts`:

```bash
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local   # test local D1
pnpm --filter auth.slyxup.online db:migrate:remote  # only after local passes
pnpm typecheck
git add src/lib/schema.ts migrations/
git commit -m "drizzle(auth): add <table>, generate + migrate local+remote"
```

Commit both schema + `migrations/*.sql` + `_journal.json`. Use `sqliteTable`, `integer({mode:'boolean'})`, `text({mode:'json'})`, batch `floor(100/cols)`.

See `DRIZZLE_GUIDE.md` for full.

## 4. Env — Dev/Prod Parity

- `wrangler.jsonc` `vars` = same dev/prod, committed
- `.dev.vars` = local secrets, gitignored, copy from `.env.example`
- Prod secrets = `wrangler secret put SESSION_SECRET` — never commit
- D1/KV IDs in `wrangler.jsonc` via `wrangler d1 create`

See `ENV_GUIDE.md`.

## 5. Lint / Type / Test (modern)

```bash
pnpm lint          # biome lint .
pnpm format        # biome format . --write
pnpm typecheck     # tsc --noEmit (turbo)
pnpm build         # turbo build
pnpm test          # turbo test (vitest)
```

Husky pre-commit runs `lint-staged` (biome check). Fix before push.

## 6. Workers best practices

- `env.DB` via param, `crypto.randomUUID()`, `prepare().bind().all()`, `ctx.waitUntil()`, streaming, `wrangler types`
- `compatibility_date` + `nodejs_compat` always
- See `TECH_STACK.md` + `workers-best-practices` skill

## 7. PR Checklist (enforced in `pull_request_template.md`)

- [ ] Read `AGENTS.md` + relevant guide
- [ ] Schema changed? `db:generate` + `migrate:local` + `migrate:remote` done?
- [ ] `pnpm typecheck` + `lint` + `build` pass?
- [ ] `wrangler types` run?
- [ ] Domain folder naming `.slyxup.online`?
- [ ] No Dashboard/Billing beyond placeholder?
- [ ] Conventional commit?

## 8. AI Agent — Extra

AI must keep commits small, per-phase. Each commit should be reviewable in <100 lines. Use `gh` for PR: `gh pr create --fill`.

Never take anything lightly — everything must be `pnpm` modern, CF-only, no Docker/Postgres.
