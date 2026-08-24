# WORKFLOW.md — How to Work Properly (Planning → Build → Commit → Release)

> Industry-standard, modern, strict. AI + human both follow this. No light work.

## 0. Development-First Workflow — Pehle Dev me banao, verify karo, phir Prod pe push (NEW)

> **Tumhara flow: `development me sab banao → local verify → jab sahi lage tab `main` pe push → prod auto-deploy + SDK auto-version`**

### Hinglish Summary (tumhare liye)
- **Pehle sab dev me:** `feat/*` branch pe code likho, `pnpm typecheck/build` local pe pass karwao, `wrangler dev --local` + `D1 local` pe test karo, `npm publish --dry-run` se SDK check karo. Changes dikhenge local `git diff` + `wrangler d1 execute` + `curl /v1/health` se.
- **Verify karo:** `pnpm typecheck && pnpm lint && pnpm build` 7/7 green hona chahiye, `pnpm cf:typegen` se `Env` types bane, `npx wrangler deploy --dry-run --config auth.slyxup.online/wrangler.jsonc` se CF bindings sahi dikhe. SDK ke liye `npm view @slyxup/core version` local `dist` check.
- **Jab sab sahi lage tab hi `main` pe push:** `gh pr create` → CI green → `gh pr merge` / `git push origin main`. Tabhi `main` push se **prod** ka kaam start hoga.
- **Prod pe auto:** `ci.yml` (typecheck/lint/build), `release.yml` (changeset version bump + `npm publish` **only if** `.changeset/*.md` hai ya unpublished package hai, warna `No changesets` → publish skip, no new version), `deploy.yml` (only `auth.slyxup.online/` change pe `wrangler deploy`). Agar **koi change nahi** (already latest, jaise `35591c7` billing 0.1.1 pe `Release success 49s` bina new publish ke), to **naya version deploy nahi hoga** — yahi verified hai.
- **Kaise check ki prod sahi hua?** `gh run list --repo slyxup/stack`, `gh run view <ID> --log`, `npm view @slyxup/core version` (new version dikhe), `curl https://auth.slyxup.online/v1/health`, `wrangler tail`, `npx wrangler d1 execute slyxup_auth --remote --config auth.slyxup.online/wrangler.jsonc --command "SELECT count(*) FROM users;"`

### Step-by-Step Commands (Dev → Verify → Prod)

```bash
# 1. DEV: naya feature branch (main se)
git checkout main && git pull origin main
git checkout -b feat/auth-sessions

# 2. CODE: schema/api/sdk banao (AGENTS.md build order follow)
# ... edit auth.slyxup.online/src/lib/schema.ts etc.

# 3. LOCAL VERIFY (push se pehle mandatory)
pnpm typecheck                          # 7/7 pass
pnpm lint                               # biome 19 files
pnpm build                              # turbo 7/7
pnpm cf:typegen                         # wrangler types auth+billing
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local   # local D1
npx wrangler d1 execute slyxup_auth --local --config auth.slyxup.online/wrangler.jsonc --command "SELECT name FROM sqlite_master WHERE type='table';"
pnpm --filter @slyxup/core exec npm publish --dry-run --access public # SDK dry-run
npx wrangler deploy --dry-run --config auth.slyxup.online/wrangler.jsonc # 19.96 KiB gzip

# 4. SDK version bump (agar packages/* change kiya to)
pnpm changeset                          # select patch/minor/major, .changeset/*.md banta hai
git add .changeset/*.md
git commit -m "chore: add changeset for @slyxup/core"

# 5. COMMIT & PUSH to feature branch (NOT main yet)
git add -p
git commit -m "feat(auth): add sessions table"
git push -u origin feat/auth-sessions
gh pr create --fill --label feat        # CI chalega PR pe, prod deploy nahi

# 6. PR VERIFY: gh pr view, CI green check
gh run list --repo slyxup/stack --limit 3
# ci success hona chahiye (Typecheck success Build success), security failure ignore (only ci required)

# 7. JAB SAB SAHI LAGE, tab main pe merge/push (prod trigger)
gh pr merge --squash --delete-branch    # ya: git checkout main && git merge feat/auth-sessions && git push origin main
# Ab prod: ci.yml main pe, release.yml (if changeset -> version bump + npm publish, else skip), deploy.yml (if auth changed -> wrangler deploy)

# 8. POST-PUSH VERIFY (prod)
gh run list --repo slyxup/stack --limit 3 # ci success, release success/skip, deploy skipped/in_progress
gh run view <RELEASE_ID> --log | grep -E "Publishing|success"
npm view @slyxup/core version            # new version dikhe to publish OK
curl https://auth.slyxup.online/v1/health
npx wrangler d1 execute slyxup_auth --remote --config auth.slyxup.online/wrangler.jsonc --command "SELECT count(*) FROM users;"
```

**Important Rules:**
- **Direct `main` pe push only jab verify ho gaya** — warna CI fail hoga aur `main` red. Best: `feat/*` → PR → CI green → merge.
- **No changeset = no version bump** — agar `packages/*` me koi change nahi aur `.changeset/*.md` nahi banaya, to `release.yml` bolega `No changesets found` → publish skip, `success` but no new npm version (verified `35591c7` pe `Release success 49s` bina publish). Yahi chahiye tha.
- **SDK version auto:** `pnpm changeset version` `package.json` bump karta hai (`0.1.0 -> 0.1.1`), `pnpm changeset publish` `npm publish --access public` se `NPM_TOKEN` se publish. Local me `dist` build hona chahiye pehle.
- **Deploy only on change:** `deploy.yml` `if: contains(head_commit.modified, 'auth.slyxup.online/')` — agar auth folder change nahi to `skipped`, warna `wrangler deploy` prod D1 `cfa91e79` pe.

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
