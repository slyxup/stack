# @slyxup/cli

Command-line tool for the SlyxUp Auth platform — developer login, project and API-key management, project bootstrap, and setup health checks.

## Install

```bash
npm install -g @slyxup/cli
# or run ad-hoc:
npx @slyxup/cli --help
```

## Commands

### `slyxup login`

```bash
slyxup login                          # prompts for email/password; auto-creates account if new
slyxup login --new                    # force registration
slyxup login -e dev@acme.com -p secret
slyxup login --api-url http://localhost:8787   # self-host / local worker
```

Credentials are stored in `~/.config/slyxup/credentials.json` (never commit this).

```bash
slyxup whoami     # show current developer
slyxup logout     # clear stored credentials
```

### `slyxup project`

```bash
slyxup project create "My SaaS App" \
  -s my-saas-app \                     # slug (default: kebab-case of name)
  -d "Short description"

slyxup project list
slyxup project delete <id>            # coming soon
```

### `slyxup keys`

```bash
slyxup keys create --project-id <id> --type publishable   # pk_test_… (frontend-safe)
slyxup keys create --project-id <id> --type secret        # sk_test_… (server-only)
  --env live          # test (default) | live
  --name billing-v1   # label

slyxup keys list --project-id <id>    # hashed keys are never shown
slyxup keys revoke <key-id>
```

Secret keys are printed **once** at creation — save them immediately.

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

## Typical flow

```bash
slyxup login
slyxup project create "My App"
slyxup keys create --project-id <id> --type publishable
slyxup env --publishable-key <key> --out .env.local
slyxup npm i @slyxup/react @slyxup/ui   # in your app
slyxup doctor                            # verify
```

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
