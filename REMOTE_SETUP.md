# REMOTE_SETUP.md — Create GitHub Remote (Manual, 1 min)

> `gh repo create slyxup/stack` fails with `cannot create repository for slyxup` — missing `admin:org` scope.
> Do ONE of below, then `git push`.

## Option A — Refresh token (recommended, 10 sec)

```bash
gh auth refresh -h github.com -s admin:org
# re-login, then:
gh repo create slyxup/stack --public --description "SlyxUp Stack — CF Workers + D1 monorepo (auth + billing + marketing)" --source=. --remote=origin --push
```

## Option B — Manual on GitHub UI (if refresh not possible)

1. Go to https://github.com/new
2. Owner: `slyxup` → Repository name: `stack` → Public → Create
3. Then locally:

```bash
cd slyxup.online/stack
git remote add origin https://github.com/slyxup/stack.git
git push -u origin main
```

## After remote

```bash
# Protect main (requires CI green)
gh api repos/slyxup/stack/branches/main/protection -X PUT \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]=ci \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true

# Verify
gh repo view slyxup/stack --json url,visibility
git log --oneline -5
```

Until remote, local `main` is source of truth — keep committing per `WORKFLOW.md` (conventional commits).
