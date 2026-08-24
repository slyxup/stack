# ADR 001 — Cloudflare Workers + D1 (CF Only)

Date: 2025-08-24

## Context

Need edge runtime, no Docker/Postgres overhead, per business rule "only CF things".

## Decision

Use Cloudflare Workers (Hono) + D1 (SQLite) + KV + R2, per-domain `wrangler.jsonc`, `drizzle-orm/d1`, `sqliteTable`.

Postgres/Docker rejected — D1 is single-writer but sufficient for auth V1; 100 param limit handled via batching.

## Consequences

- Schema uses `integer({mode:'boolean'})`, `crypto.randomUUID()`
- Migrations per-domain, `wrangler d1 migrations apply`
- No `docker-compose.yml`.
