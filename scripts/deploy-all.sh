#!/usr/bin/env bash
set -euo pipefail

# SlyxUp Stack — One-command deploy for all services
# Usage: ./scripts/deploy-all.sh [--local|--remote]
# Requires: pnpm, wrangler, CLOUDFLARE_API_TOKEN, PADDLE_API_KEY (for billing)

MODE=${1:---remote}

echo "== SlyxUp Stack — Full Deploy ($MODE) =="

echo "[1/6] Typecheck all..."
pnpm typecheck

echo "[2/6] Build packages (core → ui)..."
pnpm --filter @slyxup/core build
pnpm --filter @slyxup/ui build

echo "[3/6] DB generate & migrate..."
pnpm db:generate
pnpm --filter auth db:migrate:$([ "$MODE" = "--local" ] && echo "local" || echo "remote")
pnpm --filter billing db:migrate:$([ "$MODE" = "--local" ] && echo "local" || echo "remote")

echo "[4/6] Build web (admin + marketing)..."
pnpm --filter web build

echo "[5/6] Deploy auth & billing (Workers)..."
pnpm --filter auth run deploy
pnpm --filter billing run deploy

echo "[6/6] Deploy web (Pages)..."
pnpm --filter web run deploy

echo "== Done — all services deployed =="
echo "Auth:    https://auth.slyxup.online/v1/health"
echo "Billing: https://billing.slyxup.online/v1/health"
echo "Web:     https://stack.slyxup.online"
