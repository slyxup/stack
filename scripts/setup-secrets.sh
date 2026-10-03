#!/bin/bash
# SlyxUp Stack — secrets setup (Day 5).
# Local dev writes gitignored `.dev.vars`; staging/production use `wrangler secret put`.
# OAuth *client IDs* are public identifiers (exposed in redirect URLs) and stay
# in wrangler.jsonc `vars`. Client *secrets*, session keys and Paddle keys are
# secrets and must NEVER be committed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }

rand_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -base64 32;
  else node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"; fi
}

ensure_line() { # file KEY VALUE — append KEY=VALUE only if KEY absent
  local file="$1" key="$2" value="$3"
  touch "$file"
  grep -q "^${key}=" "$file" || echo "${key}=${value}" >> "$file"
}

cmd="${1:-local}"

case "$cmd" in
  local)
    echo "==> Local dev: writing gitignored .dev.vars (values are placeholders unless prompted)"
    for svc in auth billing; do
      [ -f "$ROOT/$svc/.dev.vars" ] || {
        ex="$ROOT/$svc/.env.example"
        [ -f "$ex" ] && cp "$ex" "$ROOT/$svc/.dev.vars" || touch "$ROOT/$svc/.dev.vars"
      }
    done
    ensure_line "$ROOT/auth/.dev.vars" "SESSION_SECRET" "$(rand_secret)"
    ensure_line "$ROOT/auth/.dev.vars" "ENCRYPTION_KEY" "$(rand_secret)"
    echo "    auth/.dev.vars ready (SESSION_SECRET, ENCRYPTION_KEY generated if missing)"
    echo "    billing/.dev.vars ready — fill PADDLE_* keys to test checkout"
    echo "    Optional: GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_SECRET, email provider key"
    ;;
  staging|production)
    need wrangler
    if [ "$cmd" = "staging" ]; then CFG="--env staging"; else CFG="--config wrangler.com-workers-dev.jsonc"; fi
    echo "==> $cmd: setting Worker secrets via 'wrangler secret put' (values never touch git)"
    read -rsp "SESSION_SECRET (empty = generate): " SESSION_SECRET; echo
    [ -z "${SESSION_SECRET:-}" ] && SESSION_SECRET="$(rand_secret)"
    printf '%s' "$SESSION_SECRET" | (cd "$ROOT/auth" && wrangler secret put SESSION_SECRET $CFG)
    read -rsp "ENCRYPTION_KEY (empty = generate): " ENCRYPTION_KEY; echo
    [ -z "${ENCRYPTION_KEY:-}" ] && ENCRYPTION_KEY="$(rand_secret)"
    printf '%s' "$ENCRYPTION_KEY" | (cd "$ROOT/auth" && wrangler secret put ENCRYPTION_KEY $CFG)
    echo "    Auth secrets stored. Add GOOGLE_CLIENT_SECRET / GITHUB_CLIENT_SECRET / email keys as needed:"
    echo "      (cd auth && wrangler secret put GOOGLE_CLIENT_SECRET $CFG)"
    echo "    Billing (Paddle) secrets:"
    echo "      (cd billing && wrangler secret put PADDLE_SANDBOX_API_KEY $CFG)"
    echo "      (cd billing && wrangler secret put PADDLE_SANDBOX_WEBHOOK_SECRET $CFG)"
    ;;
  audit)
    echo "==> Scanning tracked files for committed secrets…"
    if git -C "$ROOT" grep -n -i -E "CLIENT_SECRET=.{4,}|PADDLE_.*API_KEY=.{4,}|BEGIN .*PRIVATE KEY|sk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]{8,}" -- ':!*.md' ':!*.example' ':!test' ':!scripts' ':!**/test/**' | grep -v REPLACE_ME | grep -v test-only | grep -v 'randomToken' | grep -v 'whsec_\.\.\.'; then
      echo "FOUND potential secrets above — rotate and remove them."; exit 1
    else
      echo "OK: no secret values in tracked files (client IDs are public identifiers)."
    fi
    ;;
  *)
    echo "Usage: $0 [local|staging|production|audit]"; exit 2;;
esac
