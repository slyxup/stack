#!/bin/bash
# SlyxUp Stack — self-hosting bootstrap (Week 2).
# Copies wrangler configs for your own Cloudflare account and prompts for URLs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "SlyxUp Stack — self-hosted setup"
echo "================================="
read -rp "Your app URL (https://app.example.com): " APP_URL
read -rp "Auth Worker URL (https://auth.example.com): " AUTH_URL
read -rp "Billing Worker URL (https://billing.example.com): " BILLING_URL
read -rp "Cloudflare account ID: " ACCOUNT_ID

for svc in auth billing; do
  src="$ROOT/$svc/wrangler.jsonc"
  dst="$ROOT/$svc/wrangler.selfhost.jsonc"
  [ -f "$dst" ] || cp "$src" "$dst"
  echo "  copied $svc/wrangler.jsonc -> $svc/wrangler.selfhost.jsonc (edit IDs + deploy with --config)"
done

cat <<EOF

Next steps (see SELF_HOSTING.md):
  1. wrangler d1 create slyxup-auth && wrangler d1 create slyxup-billing
  2. Put database_id + KV id into auth/billing wrangler.selfhost.jsonc
  3. Set vars: APP_URL=$APP_URL AUTH_URL=$AUTH_URL BILLING=$BILLING_URL
     (account $ACCOUNT_ID)
  4. ./scripts/setup-secrets.sh local   # then ... production
  5. pnpm --filter auth db:migrate:remote && pnpm --filter billing db:migrate:remote
  6. pnpm --filter auth deploy --config wrangler.selfhost.jsonc
EOF
