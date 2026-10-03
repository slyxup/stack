# Release schema additions

Auth migration `0010_curved_puff_adder.sql`:
- `auth_challenges`: SHA-256 token hash primary key, purpose (`oauth_state`, `oauth_exchange`, `two_factor`), JSON payload, Unix-second expiry and expiry index. One-time consumption is `DELETE … RETURNING`; raw tokens are never persisted in this table.
- OAuth account unique index now includes user ID; a verified provider identity can exist in multiple projects. All callback lookups join users and constrain project scope.

Billing migration `0002_tidy_trish_tilby.sql`:
- `checkout_intents`: random UUID primary key, user/project IDs, plan FK (`restrict`), Paddle customer, unique transaction/subscription IDs, creation timestamp. Cross-DB user/project IDs are application-validated.
- `subscriptions.last_event_at`, `invoices.last_event_at`: normalized ISO UTC provider timestamp strings used in conditional upserts to reject stale writes.
- `webhook_events.lease_until`, `lease_token`: expiry plus random owner token for retry ownership; a completed event is never claimed again. Failure/completion writes require the matching owner token.

Generated with Drizzle. Apply auth and billing migrations locally, validate `pnpm test:runtime`, then apply the reviewed migrations remotely before deploying the new Workers. Existing legacy subscriptions remain readable; new subscription attribution requires checkout through the server endpoint.

## V4 security + perf additions

Auth migration `0013_massive_virginia_dare.sql`:
- `users.password_hash_version`: `'pbkdf2'` (legacy 100k) or `'pbkdf2-600k'` (current). Logins auto-rehash opportunistically.

Auth migration `0014_fresh_masque.sql`:
- `sessions.fingerprint_hash`: HMAC-SHA256(IP + normalized UA, SESSION_SECRET), null when no secret configured. Validated in `getSession()` with 5-minute rotation grace.

Auth migration `0015_rapid_weapon_omega.sql`:
- `users_email_lower_project_idx`: expression index on `(lower(email), project_id)` serving the sign-in hot path, which can't use the case-sensitive unique index.
