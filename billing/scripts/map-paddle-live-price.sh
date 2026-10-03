#!/usr/bin/env bash
set -Eeuo pipefail

# Maps a Paddle LIVE price to an existing SlyxUp billing plan.
# This is intentionally separate from Paddle credential setup.

BILLING_URL="${BILLING_URL:-https://billing-slyxup-com.billing-86c.workers.dev}"
CONFIG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/wrangler.com-workers-dev.jsonc"

read -r -p 'SlyxUp billing plan ID: ' PLAN_ID
read -r -p 'Paddle LIVE price ID (pri_...): ' LIVE_PRICE_ID
read -r -s -p 'Billing admin secret: ' ADMIN_SECRET
printf '\n'

[[ "$PLAN_ID" =~ ^[A-Za-z0-9-]+$ ]] || { printf 'Invalid plan ID\n' >&2; exit 1; }
[[ "$LIVE_PRICE_ID" == pri_* ]] || { printf 'Live price ID pri_ se start hona chahiye\n' >&2; exit 1; }

status="$(curl -sS -o /tmp/slyxup-plan-update.json -w '%{http_code}' \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  "${BILLING_URL}/v1/admin/plans/${PLAN_ID}" \
  --data "{\"paddleLivePriceId\":\"${LIVE_PRICE_ID}\"}")"

if [[ "$status" != "200" ]]; then
  printf 'Plan mapping failed (HTTP %s). Plan ID/admin secret check karein.\n' "$status" >&2
  exit 1
fi

printf 'Live Paddle price mapped successfully.\n'
