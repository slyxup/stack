# @slyxup/cli

Command-line tool for the SlyxUp Auth platform — developer login, project and API-key management, project bootstrap, and setup health checks.

## Install

```bash
npm install -g @slyxup/cli
# or run ad-hoc:
npx @slyxup/cli --help
```

## Commands

Every command supports `--json` for agent automation and `--no-color` to disable ANSI. Add `--api-url` anywhere to target a different Worker (local dev, self-host).

> **One-line agent flow** (no prompts, no TTY needed):
> ```bash
> slyxup signup -e dev@acme.com -p 'Str0ng!Pass' --json --api-url http://localhost:8787
> slyxup auth verify --token <from-email> --json
> slyxup login -e dev@acme.com -p 'Str0ng!Pass' --json
> slyxup project create "My SaaS" --json | jq -r .project.id
> slyxup keys create --project-id <id> --type publishable --env test --json | jq -r .key
> slyxup env --publishable-key pk_test_xxx --out .env.local
> slyxup doctor --json
> ```

### `slyxup login`

```bash
slyxup login                          # prompts for email/password (account must be verified)
slyxup login --new                    # create account first, then verify via email and log in
slyxup login -e dev@acme.com -p secret --json
slyxup login --api-url http://localhost:8787   # self-host / local worker
# Also: slyxup signup -e dev@acme.com -p secret --json
```

Credentials are stored in `~/.config/slyxup/credentials.json` (never commit this).

> **Security:** login uses the same verified-email auth as the platform
> (`/v1/auth/sign-in`). The stored credential is a revocable 7-day session
> token — not a static key. Unverified accounts cannot log in; use
> `slyxup auth resend -e you@example.com` if the email didn't arrive.

```bash
slyxup whoami     # show current developer
slyxup logout     # clear stored credentials
```

### `slyxup project`

```bash
slyxup project create "My SaaS App" \
  -s my-saas-app \                     # slug (default: kebab-case of name)
  -d "Short description" --json

slyxup project list --json
slyxup project delete <id>  # requires DELETE /v1/projects/:id (coming soon)
```

### `slyxup keys`

```bash
slyxup keys create --project-id <id> --type publishable --json  # pk_test_… (frontend-safe)
slyxup keys create --project-id <id> --type secret --env live --name billing-v1 --json
slyxup keys list --project-id <id> --json    # hashed keys are never shown
slyxup keys revoke <key-id> --json
```

Secret keys are printed **once** at creation — save them immediately. Keys are SHA-256 hashed at rest; `list` never returns plaintext.

### `slyxup domains`

Custom auth domains for a project (after adding one in Cloudflare). Domains are stored in the new scalable `project_domains` table (unlimited per project) — legacy `allowedDomains` JSON kept for compat.

```bash
slyxup domains list --project-id <id> --json
slyxup domains add auth.acme.com --project-id <id> --json
slyxup domains remove auth.acme.com --project-id <id> --json
slyxup domains go-live --project-id <id> --json        # verify DNS + activate custom domain (test→live)
```

### `slyxup auth` — test app-user flows (all drive [`@slyxup/core`](../core) — same verification, rate-limit, OAuth as the UI)

```bash
slyxup auth signup -e ada@acme.com -p secret123 --json   # sends verification email
slyxup auth signin -e ada@acme.com -p secret123 --json   # prints session id + expiry
slyxup auth verify --token <token-from-email> --json     # verify email address
slyxup auth resend -e ada@acme.com --json                  # resend verification
slyxup auth oauth --provider google --json               # prints OAuth URL (or opens browser)
# Top-level sugar (same as above, for agents):
slyxup signup -e ada@acme.com -p secret123 --json
```

All subcommands accept `--json` and `--api-url http://localhost:8787` for local worker testing. Every auth request sends `X-Publishable-Key` when a key is configured; an invalid key now returns `401 INVALID_PUBLISHABLE_KEY` instead of silently succeeding (fixes demo-with-wrong-pk).

### `slyxup init` — connect an existing app

Run in your Next.js/React project root:

```bash
cd my-saas && slyxup init
```

Detects framework (Next.js App/Pages Router, React), language, and package manager, then prints the exact steps to link a project and install SDKs. Idempotent — safe to re-run.

### `slyxup env`

Emit ready-to-paste environment variables:

```bash
slyxup env --publishable-key pk_test_xxx            # stdout
slyxup env --publishable-key pk_test_xxx --out .env.local   # append to file
```

Output:

```
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online
```

### `slyxup doctor`

Health check for local setup:

```bash
✓ Logged in
✗ Framework detected — not a Next.js/React project root?
✓ TypeScript
✗ Publishable key in env — add NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY to .env.local
✓ API reachable
```

Exits `1` when anything actionable is failing.

## Environment

| Variable | Purpose |
|---|---|
| `SLYXUP_API_URL` | Default API base (else `https://auth.slyxup.online`) |

## Typical flow (human + agent-friendly)

```bash
# Human (interactive)
slyxup login
slyxup project create "My App"
slyxup keys create --project-id <id> --type publishable
slyxup env --publishable-key <key> --out .env.local
npm i @slyxup/react @slyxup/ui           # in your app
slyxup doctor                            # verify

# Agent (one-line, --json, no TTY)
slyxup login -e dev@acme.com -p '...' --json
slyxup project create "My App" --json > /tmp/proj.json
PID=$(jq -r .project.id /tmp/proj.json)
slyxup keys create --project-id $PID --type publishable --json > /tmp/key.json
slyxup env --publishable-key $(jq -r .key /tmp/key.json) --out .env.local
slyxup doctor --json | jq .
```

### First-auth bootstrap (no chicken-egg)

You do **not** need a `pk_…/sk_…` to create your first account. Run `slyxup login --new` or `slyxup signup` with just email + password — it creates a platform user (no `projectId`) and sends a verification email. After `slyxup auth verify --token …` and `slyxup login`, you can `slyxup project create` to mint your first `pk_test_…`.

App users signed up via SDK **must** send a valid `X-Publishable-Key`; requests with a wrong or missing key get `401 INVALID_PUBLISHABLE_KEY` instead of creating orphan global users.

## Database notes (V1 fixes)

- `developers` is now a thin role link to `users` (no duplicated email/password/name). Delete a user → developer row cascades.
- New `project_domains` table replaces the `allowedDomains` JSON for scalable, indexable multi-platform support; CORS reads both.
- `users` now has `deletedAt` soft-delete, `projectCreated` composite index for large tenants, and project-scoped `(email, projectId)` uniqueness.
- `sessions` explicitly deleted on `users` delete (reported orphan bug) plus `ON DELETE CASCADE`; added `user_expires` composite index.
- `api_keys.hashedKey` is now SHA-256 hex (not `btoa`), with `lastUsedAt` touch and expiry index.
- `audit_logs.userId` now FK `ON DELETE SET NULL` for compliance.

Run after pulling: `pnpm --filter auth.slyxup.online db:generate && pnpm --filter auth.slyxup.online db:migrate:local` (migration `0007_daffy_micromax`).

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
