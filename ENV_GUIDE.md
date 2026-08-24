# ENV_GUIDE.md — Dev/Prod Parity (Cloudflare Workers, No Docker)

> Goal: `wrangler dev` (local) and `wrangler deploy` (prod) behave IDENTICALLY. No `.env` drift.

## 1. Env layers (CF Workers)

| Layer | File | Committed? | When used |
|-------|------|------------|-----------|
| `vars` | `auth.slyxup.online/wrangler.jsonc` `vars` | YES | Both dev & prod — non-secret, same value |
| `.dev.vars` | `auth.slyxup.online/.dev.vars` | NO (gitignored) | `wrangler dev` only — local secrets |
| Secrets | `wrangler secret put NAME` | NO (encrypted in CF) | `wrangler deploy` prod |
| `D1/KV IDs` | `wrangler.jsonc` bindings | YES | Both — must match `wrangler d1 create` output |
| `.env.example` | `stack/.env.example` | YES | Template for `.dev.vars` |

**Never use**: `process.env`, `.env`, `DATABASE_URL` in Worker — use `env.NAME`.

## 2. What goes where

### `wrangler.jsonc` `vars` (non-secret, same dev/prod)
```jsonc
{
  "vars": {
    "APP_URL": "https://stack.slyxup.online",
    "API_URL": "https://auth.slyxup.online",
    "HOSTED_AUTH_URL": "https://auth.slyxup.online",
    "CORS_ORIGINS": "https://stack.slyxup.online,http://localhost:3000",
    "ALLOWED_REDIRECT_ORIGINS": "https://myapp.com,http://localhost:3000"
  }
}
```

### `.dev.vars` (local secrets — copy from `.env.example`)
```
# auth.slyxup.online/.dev.vars — NEVER commit
SESSION_SECRET=local-dev-32-char-random-xxxxxxxx
ENCRYPTION_KEY=local-dev-32-char-random-yyyyyyyy
GOOGLE_CLIENT_SECRET=local-dev-secret
GITHUB_CLIENT_SECRET=local-dev-secret
SMTP_PASSWORD=local-dev
```

### Prod secrets (encrypted, set once)
```bash
wrangler secret put SESSION_SECRET --config auth.slyxup.online/wrangler.jsonc
wrangler secret put ENCRYPTION_KEY
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SMTP_PASSWORD
# verify
wrangler secret list
```

### Bindings (D1/KV) — same file, different IDs per env but same binding name
```jsonc
{
  "d1_databases": [{ "binding": "DB", "database_name": "slyxup_auth", "database_id": "REPLACE_WITH_D1_ID" }],
  "kv_namespaces": [{ "binding": "KV", "id": "REPLACE_WITH_KV_ID" }]
}
```
Create: `wrangler d1 create slyxup_auth` → copy `database_id` → paste in `wrangler.jsonc`.

## 3. Dev/prod parity — how to keep same

1. **Single `wrangler.jsonc`** — don't maintain `wrangler.dev.jsonc` vs `wrangler.prod.jsonc`. Use same file; `dev` uses `.dev.vars` + `--local` D1, `deploy` uses secrets + remote D1.
2. **Copy `.env.example` → `.dev.vars`** — no drift:
   ```bash
   cp stack/.env.example stack/auth.slyxup.online/.dev.vars
   # then fill local secrets
   ```
3. **Bindings name same** — `env.DB`, `env.KV` in code — never `env.DB_LOCAL`.
4. **Test both**:
   ```bash
   wrangler dev --local          # local D1 + .dev.vars
   wrangler dev --remote         # remote D1 + prod vars (caution)
   wrangler deploy --dry-run     # check bindings
   ```
5. **No Docker env** — no `DATABASE_URL`, no `docker-compose.yml`.

## 4. Local dev workflow

```bash
cd slyxup.online/stack

# 1. D1 local
wrangler d1 create slyxup_auth --local
# 2. Migrate local
pnpm --filter auth.slyxup.online db:migrate:local
# 3. Secrets local
cp .env.example auth.slyxup.online/.dev.vars
# edit .dev.vars with local values
# 4. Typegen
pnpm --filter auth.slyxup.online typegen  # wrangler types
# 5. Dev
pnpm --filter auth.slyxup.online dev  # http://localhost:8787
# test
curl http://localhost:8787/v1/health
```

## 5. Prod deploy workflow

```bash
# 1. D1 remote
wrangler d1 create slyxup_auth
wrangler d1 migrations apply slyxup_auth --remote
# 2. Secrets prod
wrangler secret put SESSION_SECRET
wrangler secret put ENCRYPTION_KEY
# 3. Deploy
pnpm --filter auth.slyxup.online deploy
# verify
curl https://auth.slyxup.online/v1/health
wrangler tail  # logs
```

## 6. Stack marketing (`stack.slyxup.online`) — Pages

- `wrangler.jsonc` `assets: { directory: ".next" }`
- Env: `NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online` (public, can be in `vars`)
- Deploy: `pnpm --filter stack.slyxup.online build && pnpm --filter stack.slyxup.online deploy`

## 7. Common mistakes

- ❌ Putting `SESSION_SECRET` in `wrangler.jsonc` `vars` → leaked in git
- ❌ Using `.env` instead of `.dev.vars` → `wrangler dev` ignores it
- ❌ Different `compatibility_date` per domain → unify to `2025-08-24`
- ❌ Forgetting `wrangler secret put` after changing `.dev.vars` → prod still old
- ❌ Committing `.dev.vars` → add to `.gitignore`
- ❌ Using `wrangler.toml` → use `wrangler.jsonc`

## 8. Checklist before `deploy`

- [ ] `wrangler.jsonc` `vars` same as prod?
- [ ] `wrangler secret list` shows all secrets?
- [ ] `wrangler d1 migrations apply --remote` done?
- [ ] `wrangler types` run?
- [ ] `pnpm typecheck` passes?
- [ ] `.dev.vars` gitignored?

---
**Parity = same `wrangler.jsonc` + `.dev.vars` locally / secrets in prod, same `env.*` in code.**
