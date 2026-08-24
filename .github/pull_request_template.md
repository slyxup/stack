## Description

Fixes #

## Phase (see ROADMAP.md)

- [ ] DB Schema (drizzle:generate + migrate local+remote)
- [ ] API / Core / React / Nextjs / UI / CLI / Marketing

## Checklist (Industry Standard)

- [ ] Read `AGENTS.md` + `TECH_STACK.md` + `DRIZZLE_GUIDE.md` (if DB)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` / `pnpm format` passes (biome)
- [ ] `pnpm build` passes (`turbo build`)
- [ ] Schema changed? `pnpm db:generate` + `db:migrate:local` + `db:migrate:remote` + commit migrations
- [ ] `wrangler types` run, `worker-configuration.d.ts` updated?
- [ ] Env: `wrangler.jsonc` vars vs `.dev.vars` vs `wrangler secret put` correct?
- [ ] No `Math.random()` / hardcoded secrets / `pgTable` / `docker`?
- [ ] Domain folder `.slyxup.online` naming correct?
- [ ] Conventional commit (`feat(auth): ...`)?
- [ ] No Dashboard/Billing beyond placeholder (V1 scope)?

## Screenshots / Logs

```
pnpm typecheck
pnpm build
wrangler dev --local # health check
```

## Breaking change?

- [ ] No
- [ ] Yes (describe migration)
