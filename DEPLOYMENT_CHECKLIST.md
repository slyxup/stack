# Deployment Checklist

Run through this before every production deploy.

## Code

- [ ] `pnpm typecheck` passes (all 7 packages)
- [ ] `pnpm --filter auth test` and `pnpm --filter billing test` pass
- [ ] `pnpm build` passes
- [ ] `pnpm audit --prod` — no critical vulnerabilities
- [ ] No `console.log` left in workers (structured JSON logs only)
- [ ] No hardcoded secrets (`./scripts/setup-secrets.sh audit` prints OK)

## Database

- [ ] Review pending migrations:
  `wrangler d1 migrations list <db> --remote` (auth + billing)
- [ ] Back up production D1:
  `wrangler d1 export <db> --remote --output backup-$(date +%Y%m%d).sql`
- [ ] Note current Worker version IDs for rollback:
  `wrangler deployments list`

## Staging (if configured)

- [ ] Deploy to staging first, run smoke tests there
- [ ] `curl https://<auth-staging>/v1/health` → `{"ok":true}`
- [ ] `curl https://<billing-staging>/v1/health` → `{"ok":true}`

## Deploy order (migrations FIRST — zero downtime)

1. `pnpm --filter auth db:migrate:remote`
2. `pnpm --filter billing db:migrate:remote`
3. `pnpm --filter auth deploy`
4. `pnpm --filter billing deploy`
5. `pnpm --filter web build && pnpm --filter web deploy`

## Verify

- [ ] Health endpoints return `ok:true` (auth, billing, web)
- [ ] Smoke test: sign-up → verify → sign-in → session fetch
- [ ] Smoke test: wrong password → 401 (not 500)
- [ ] Rate limit: 6 rapid sign-ins → 6th is 429 `TOO_MANY_REQUESTS`
- [ ] CSRF: POST without `X-CSRF-Token` → 403 `CSRF_TOKEN_INVALID`
- [ ] Billing webhook → Paddle dashboard shows 200s

## Rollback

```bash
wrangler rollback --message "rollback vX.Y.Z"
# D1 has no automatic rollback — restore from the backup SQL if a migration
# itself was bad, otherwise rolling back Worker code is enough.
```
