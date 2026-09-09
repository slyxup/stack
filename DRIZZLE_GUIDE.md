# D1 and Drizzle migrations

## Sources of truth

| Service | Schema | Config | Migrations | Database |
| --- | --- | --- | --- | --- |
| Auth | `auth/src/lib/schema.ts` | `auth/drizzle.config.ts` | `auth/migrations/` | `slyxup_auth` |
| Billing | `billing/src/lib/schema.ts` | `billing/drizzle.config.ts` | `billing/migrations/` | `slyxup_billing` |

Billing owns billing tables. D1 cannot enforce foreign keys across databases; cross-service user/project references need application validation. A read-only TypeScript helper does not make a D1 binding read-only at the platform level.

## D1 conventions

- Use `sqliteTable`, not PostgreSQL tables/drivers.
- IDs: text primary keys with `crypto.randomUUID()` defaults.
- Booleans: `integer('enabled', { mode: 'boolean' })`.
- Timestamps: `integer('created_at', { mode: 'timestamp' })`; pass JavaScript `Date` values, stored as Unix seconds.
- JSON: `text('settings', { mode: 'json' }).$type<Settings>()`.
- Explicit foreign-key deletion policies; never assume foreign keys are disabled.
- Parameterize values; never interpolate user input into SQL or identifiers.
- Stay within the configured D1 bound-parameter limit; batch bulk rows accordingly.
- Use D1/Drizzle `batch` for related atomic writes. Do not assume interactive PostgreSQL transactions exist in D1.

## Schema-change workflow

```bash
# After an intentional auth schema change:
pnpm --filter auth db:generate
pnpm --filter auth db:migrate:local
pnpm typecheck && pnpm build && pnpm test
# Review generated SQL and remote pending history before applying:
pnpm --filter auth exec wrangler d1 migrations list slyxup_auth --remote
pnpm --filter auth db:migrate:remote
pnpm cf:typegen
```

Use the equivalent `billing` commands for billing schema changes. Commit/review the schema, generated migration SQL and `migrations/meta` together. Generate from the service directory through its pnpm script; paths in Drizzle configs are service-relative. Never hand-edit migration history to make a failed check green.

The current configs use `d1-http` credentials for remote tooling. `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` and `CLOUDFLARE_D1_TOKEN` are tooling environment variables; runtime Workers access bindings through `env.DB`. Do not place tooling tokens in committed files.

## Existing versus fresh local databases

```bash
pnpm --filter billing exec wrangler d1 migrations list slyxup_billing --local
pnpm --filter billing exec wrangler d1 migrations apply slyxup_billing --local --persist-to /tmp/opencode/slyxup-billing-validation
```

A fresh isolated state validates the migration chain without deleting existing local data. If a table already exists but its creation migration is pending, inspect schema and migration history; resolve the mismatch deliberately rather than dropping the database or blindly marking migrations applied.

On 2026-09-09, the existing local billing state had this mismatch, while the full migration chain applied successfully to fresh isolated state. The 3.0.0 release generates auth 0010 (durable challenges and scoped OAuth uniqueness) and billing 0002 (checkout attribution, event ordering and leases). See `DATABASE_SCHEMA.md`.
