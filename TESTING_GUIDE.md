# TESTING_GUIDE.md — Modern Industry Standard (Vitest + Workers)

## Stack

- **Unit/Integration**: Vitest (`pnpm test`), `drizzle-orm` mock via `env.DB` (D1 local)
- **E2E**: `wrangler dev --local` + `fetch` to `/v1/*`, Playwright for UI (`packages/ui`)
- **No Jest**: Vitest only, `globals: true`

## How to Run

```bash
pnpm test          # turbo test (all workspaces)
pnpm --filter auth.slyxup.online test  # worker unit
wrangler dev --local --test  # D1 local + KV mock
```

## Drizzle Tests

```ts
import { drizzle } from 'drizzle-orm/d1';
import { users } from './lib/schema';
import { eq } from 'drizzle-orm';

test('create user', async () => {
  const db = drizzle(env.DB, { schema });
  await db.insert(users).values({ email: 'a@b.com' });
  const found = await db.select().from(users).where(eq(users.email, 'a@b.com')).get();
  expect(found?.email).toBe('a@b.com');
});
```

- Use `env.DB` from `wrangler` test binding — not real D1
- Batch tests must assert `floor(100/cols)` logic

## Workers Tests

- Mock `env` via `wrangler` `unstable_dev`
- No `Math.random()` — use `crypto.randomUUID()` (stub if needed)
- `ctx.waitUntil` must be tracked in mock

## Coverage

- `coverage` threshold 80% for `auth.slyxup.online/src/services/*`
- CI fails if `pnpm test -- --coverage` <80%

See `ci.yml` `Test` step.
