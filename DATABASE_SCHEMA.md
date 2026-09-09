# Release schema additions

Auth migration `0010_curved_puff_adder.sql`:
- `auth_challenges`: SHA-256 token hash primary key, purpose (`oauth_state`, `oauth_exchange`, `two_factor`), JSON payload, Unix-second expiry and expiry index. One-time consumption is `DELETE … RETURNING`; raw tokens are never persisted in this table.
- OAuth account unique index now includes user ID; a verified provider identity can exist in multiple projects. All callback lookups join users and constrain project scope.

Billing migration `0002_tidy_trish_tilby.sql`:
- `checkout_intents`: random UUID primary key, user/project IDs, plan FK (`restrict`), Paddle customer, unique transaction/subscription IDs, creation timestamp. Cross-DB user/project IDs are application-validated.
- `subscriptions.last_event_at`, `invoices.last_event_at`: normalized ISO UTC provider timestamp strings used in conditional upserts to reject stale writes.
- `webhook_events.lease_until`, `lease_token`: expiry plus random owner token for retry ownership; a completed event is never claimed again. Failure/completion writes require the matching owner token.

Generated with Drizzle. Apply auth and billing migrations locally, validate `pnpm test:runtime`, then apply the reviewed migrations remotely before deploying the new Workers. Existing legacy subscriptions remain readable; new subscription attribution requires checkout through the server endpoint.
