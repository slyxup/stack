# WORKFLOW.md — How to Work Properly (Planning → Build → Commit → Release)

> Industry-standard, modern, strict. AI + human both follow this. No light work.

## 1. Branching & Commits (Conventional)

```
main ──●──●──●──● (protected, always green)
        \   \   \
         feat/auth-schema  fix/kv-ttl  chore/biome
```

- Create: `git checkout -b feat/auth-d1-sessions` (from `main`)
- Commit: `feat(auth): add sessions table with D1 + generate/migrate` (commitlint enforced)
- Push: `git push -u origin feat/auth-d1-sessions`
- PR: `gh pr create --fill --label "feat"` → must pass CI → squash merge to `main`

Types: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|deps|drizzle`

## 2. Planning Before Build (Mandatory)

1. Read `ROADMAP.md` → pick next phase (e.g., Phase 1 DB)
2. Read `AGENTS.md` §2 build order, `TECH_STACK.md`, `DRIZZLE_GUIDE.md`
3. Open issue: `gh issue create --title "feat(auth): D1 schema for sessions"` → label `feat`
4. In PR description: copy `pull_request_template.md` checklist
5. Break into ≤100-line commits — AI must not dump 500-line commit

## 3. Per-Commit Checklist (Husky runs lint-staged + commitlint)

Before `git commit`:

```bash
pnpm typecheck
pnpm lint
pnpm build
# if schema changed:
pnpm db:generate
pnpm db:migrate:local && pnpm db:migrate:remote
pnpm cf:typegen
```

Pre-commit hook runs `biome check --write` on staged files — fix before commit.

## 4. Version Control (Git)

```bash
git init (already done in stack/)
git config user.name "ysr-hameed"
git config user.email "ysr@slyxup.online"
git branch -M main
git remote add origin https://github.com/slyxup/stack.git  # created via gh
git add .
git commit -m "chore: initial CF monorepo with domain-based structure + planning MDs"
git push -u origin main
# protect main
gh api repos/slyxup/stack/branches/main/protection -f required_status_checks.strict=true -f required_status_checks.contexts[]=ci
```

- No `git add .` without review — `git add p` per-file
- Every commit must be `type(scope): subject` + body if migration: `BREAKING CHANGE:`
- Keep `main` clean — rebase `feat` on `main` before PR

## 5. Release (Changesets)

```bash
pnpm changeset  # select packages, semver bump (patch/minor/major)
git add .changeset/*.md
git commit -m "chore: add changeset for @slyxup/core"
# on merge to main, release.yml runs:
pnpm changeset version  # bumps package.json versions
pnpm changeset publish  # publishes to npm (needs NPM_TOKEN)
```

Version `0.1.0` → `0.2.0` until `1.0.0` stable.

## 6. CI/CD (GitHub Actions)

- `ci.yml` on PR/push `main`: install → typecheck → lint → build → test → drizzle check → wrangler types
- `release.yml` on push `main`: changesets version/publish
- `deploy.yml` on `auth.slyxup.online/` changes: `wrangler deploy` (needs `CLOUDFLARE_API_TOKEN`)

All must be green before merge — branch protection enforces.

## 7. Security & Env

- No secrets in repo — `wrangler secret put` only
- `CODEQL` via `ci.yml` security job
- `SECURITY.md` for private reports

## 8. AI Instructions

- Keep commits every logical unit — don't batch 3 phases in 1 commit
- Use `gh` for all GitHub ops: `gh pr create`, `gh issue create`, `gh api`
- Follow `AGENTS.md` build order strictly
- Update `ROADMAP.md` Phase checkbox after each phase merged

---
**Modern standard: conventional commits + Husky + biome + changesets + branch protection + CI must-pass.**
