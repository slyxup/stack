# Troubleshooting

## `CSRF_TOKEN_INVALID` (403) on every mutation

The SDK handles this automatically. If you call the API manually: `GET /v1/health`,
read the `X-CSRF-Token` response header (and `slyxup_csrf` cookie), then send it
as the `X-CSRF-Token` request header with `credentials: 'include'`.
Server-to-server calls with `Authorization: Bearer sk_…` / `X-Secret-Key` are exempt.

## `TOO_MANY_REQUESTS` (429)

Per-endpoint budgets (see `RATE_LIMITS` in `auth/src/lib/rate-limit.ts`):
sign-in 5/min, sign-up 3/5min, password flows 3–5/5min. Wait for `Retry-After`
seconds. Behind a NAT/proxy every user shares one IP — forward
`CF-Connecting-IP` correctly.

## `EMAIL_NOT_VERIFIED` on sign-in

Expected until the user clicks the verification link. Resend via
`POST /v1/verification/resend`. Bootstrap admin is auto-verified.

## `PASSWORD_CHANGE_REQUIRED`

The account uses a default/bootstrap password. `POST /v1/auth/password/force-change`
(or `/v1/auth/change-password` with a session) with a new 8+ char password.

## Session dies after network switch (mobile/VPN)

Sessions are fingerprinted to IP + User-Agent with a 5-minute rotation grace.
A hop immediately after login rotates silently; a different fingerprint on an
older session revokes it (hijack defense). If users roam constantly and logouts
annoy, the grace lives in `getSession()` (`auth/src/services/auth.service.ts`).

## Old password hashes after upgrade

`passwordHashVersion` tracks `pbkdf2` (legacy 100k) vs `pbkdf2-600k` (current).
Logins auto-rehash opportunistically — no action needed. Monitor:
`SELECT passwordHashVersion, COUNT(*) FROM users GROUP BY 1;`

## CORS: `Origin is not allowed`

Add the origin to `CORS_ORIGINS` in the worker's `wrangler.jsonc` (or register
the domain via project domains — cached 60s in KV). Localhost is always allowed.

## Paddle webhooks 501 `Billing not configured`

Set `PADDLE_SANDBOX_WEBHOOK_SECRET` (and production equivalent) via
`wrangler secret put`. The status endpoint `GET /v1/webhooks/status` shows
`webhookConfigured` and the exact URL to paste into Paddle notifications.

## D1 migration failed

- Never edit an applied migration — add a new one (`pnpm --filter auth db:generate`).
- D1 enforces FKs always: deletes must respect `onDelete: cascade` or delete children first.
- Max 100 bound params per statement — batch inserts accordingly.

## `wrangler secret list` shows names only

By design — values are write-only. To rotate: `wrangler secret put NAME` again,
then redeploy. Local dev uses gitignored `.dev.vars` instead.
