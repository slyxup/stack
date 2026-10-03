#!/usr/bin/env bash
set -Eeuo pipefail

# Interactive live Paddle setup. Secrets are never written to the repository.
# The three Paddle secrets are entered through stdin and stored by Wrangler.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${ROOT_DIR}/wrangler.com-workers-dev.jsonc"
BILLING_URL="${BILLING_URL:-https://billing-slyxup-com.billing-86c.workers.dev}"
CHECKOUT_URL="https://stack.slyxup.com/pay"
WEBHOOK_URL="${BILLING_URL}/v1/webhooks/paddle"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
umask 077

fail() {
  printf '\nERROR: %s\n' "$1" >&2
  exit 1
}

prompt_required() {
  local label="$1"
  local value
  while [[ -z "${value:-}" ]]; do
    printf '%s: ' "$label" >&2
    read -r value
    [[ -n "$value" ]] || printf 'Required hai.\n' >&2
  done
  printf '%s' "$value"
}

prompt_with_default() {
  local label="$1"
  local default_value="$2"
  local value
  printf '%s [%s]: ' "$label" "$default_value" >&2
  read -r value
  printf '%s' "${value:-$default_value}"
}

prompt_secret() {
  local label="$1"
  local value=''

  while [[ -z "$value" ]]; do
    printf '%s (input hidden; stars appear after Enter): ' "$label" >&2
    IFS= read -r -s value
    printf '\n' >&2
    [[ -n "$value" ]] || printf 'Required hai.\n' >&2
  done
  printf 'Received: ' >&2
  printf '%*s' "${#value}" '' | tr ' ' '*' >&2
  printf '\n' >&2
  printf 'Input received.\n' >&2
  printf '%s' "$value"
}

wrangler_secret_put() {
  local name="$1"
  local value="$2"
  # The secret value is piped via stdin, not passed as a CLI argument.
  printf '%s' "$value" | wrangler secret put "$name" --config "$CONFIG" >/dev/null
}

validate_live_api_key() {
  local api_key="$1"
  local config_file="$TMP_DIR/paddle-curl.conf"
  local body_file="$TMP_DIR/paddle-response.json"
  cat >"$config_file" <<EOF
url = "https://api.paddle.com/products?per_page=1"
header = "Authorization: Bearer ${api_key}"
header = "Accept: application/json"
output = "${body_file}"
silent
show-error
write-out = "%{http_code}"
EOF
  local status
  status="$(curl --config "$config_file")"
  [[ "$status" == 2* ]] || fail "Live Paddle API key validate nahi hui (HTTP ${status}). vendors.paddle.com ka live API key use karein."
}

verify_worker_config() {
  local project_id="${1:-}"
  [[ -n "$project_id" ]] || return 0
  local response_file="$TMP_DIR/worker-config.json"
  local status
  status="$(curl -sS -o "$response_file" -w '%{http_code}' "${BILLING_URL}/v1/billing/config?projectId=${project_id}")"
  [[ "$status" == "200" ]] || fail "Billing Worker ne live config return nahi ki (HTTP ${status})."
  grep -q '"environment":"production"' "$response_file" ||
    fail "Worker ne production mode return nahi kiya. Project ka environment live hai?"
  grep -q '"clientToken"' "$response_file" ||
    fail "Production client token Worker se nahi aa raha."
}

verify_live_plan() {
  local project_id="$1"
  local live_price_id="$2"
  local response_file="$TMP_DIR/live-plans.json"
  local status
  status="$(curl -sS -o "$response_file" -w '%{http_code}' "${BILLING_URL}/v1/billing/plans?projectId=${project_id}")"
  [[ "$status" == "200" ]] || fail "Live plan endpoint ready nahi hai (HTTP ${status})."
  grep -q "$live_price_id" "$response_file" ||
    fail "Live price ID plans response mein nahi mila."
}

command -v wrangler >/dev/null || fail "wrangler install/login nahi hai."
command -v curl >/dev/null || fail "curl required hai."

printf '%s\n' \
  'SlyxUp Paddle LIVE setup' \
  '=======================' \
  "Checkout URL: ${CHECKOUT_URL}" \
  "Webhook URL:  ${WEBHOOK_URL}" \
  '' \
  'Important: sandbox keys mat dena. Ye vendors.paddle.com ke LIVE credentials hain.' \
  ''

LIVE_API_KEY="$(prompt_secret 'Paddle LIVE API key')"
LIVE_CLIENT_TOKEN="$(prompt_secret 'Paddle LIVE client token (live_...)')"
LIVE_WEBHOOK_SECRET="$(prompt_secret 'Paddle LIVE webhook signing secret')"

[[ "$LIVE_CLIENT_TOKEN" == live_* ]] || fail 'Live client token live_ se start hona chahiye.'

printf '\n[1/4] Live API key validate kar rahe hain...\n'
validate_live_api_key "$LIVE_API_KEY"

printf '[2/4] Live secrets Worker mein securely set kar rahe hain...\n'
wrangler_secret_put PADDLE_PRODUCTION_API_KEY "$LIVE_API_KEY"
wrangler_secret_put PADDLE_PRODUCTION_CLIENT_TOKEN "$LIVE_CLIENT_TOKEN"
wrangler_secret_put PADDLE_PRODUCTION_WEBHOOK_SECRET "$LIVE_WEBHOOK_SECRET"

printf '[3/4] Billing Worker deploy kar rahe hain...\n'
wrangler deploy --config "$CONFIG" >/dev/null

printf '[4/4] Worker secrets set ho gaye. Live mode credentials configured.\n'

printf '\nSUCCESS: Paddle Live credentials configured.\n\n'
printf 'Paddle dashboard mein ye confirm karein:\n'
printf '  Website approval: %s\n' "$CHECKOUT_URL"
printf '  Webhook destination: %s\n' "$WEBHOOK_URL"
printf '  Events: subscription.*, transaction.completed, transaction.paid, transaction.canceled, adjustment.updated\n\n'
printf 'Next step: existing billing plan mein live Paddle price ID set karein.\n'
printf 'Use the separate mapping script after you know the plan ID and live pri_ ID.\n'
