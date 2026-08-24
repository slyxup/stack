# DRIZZLE_GUIDE.md — D1 + Drizzle Migrations (Generate & Migrate Properly)

> AI must follow this for EVERY schema change. D1 is SQLite with 100 param limit — not Postgres.

## 1. Config (already in `auth.slyxup.online/`)

`auth.slyxup.online/drizzle.config.ts`:

```ts
import type { Config } from 'drizzle-kit';
export default {
  schema: './src/lib/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;
```

`auth.slyxup.online/package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply slyxup_auth --local",
    "db:migrate:remote": "wrangler d1 migrations apply slyxup_auth --remote"
  }
}
```

Root `stack/package.json`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "wrangler d1 migrations apply slyxup_auth --remote"`

## 2. Schema patterns — D1 correct (see d1-drizzle-schema skill)

```ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  prefs: text('prefs', { mode: 'json' }).$type<{ theme: string }>(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  projectIdx: index('users_project_idx').on(t.projectId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  project: one(projects, { fields: [users.projectId], references: [projects.id] }),
  sessions: many(sessions),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Rules**:
- `text('id').$defaultFn(() => crypto.randomUUID())` — no auto-increment
- `integer({ mode: 'boolean' })` / `integer({ mode: 'timestamp' })` — D1 has no BOOL/DATETIME
- `text({ mode: 'json' }).$type<T>()` — JSON as TEXT, auto-serialized
- FK always enforced — explicit `onDelete: 'cascade'` / `set null`
- Max 100 bound params — bulk insert must batch

## 3. Workflow — AFTER EVERY SCHEMA CHANGE

**Mandatory 4 steps — never skip:**

```bash
# 1. Edit schema
#   → auth.slyxup.online/src/lib/schema.ts

# 2. Generate migration (creates migrations/xxxx.sql + journal)
pnpm --filter auth.slyxup.online db:generate
# or from stack root:
pnpm db:generate

# 3. Apply to LOCAL D1 (test first)
pnpm --filter auth.slyxup.online db:migrate:local
# wrangler d1 migrations apply slyxup_auth --local

# 4. Apply to REMOTE D1 (only after local passes)
pnpm --filter auth.slyxup.online db:migrate:remote
# wrangler d1 migrations apply slyxup_auth --remote

# 5. Verify
wrangler d1 execute slyxup_auth --local --command "SELECT name FROM sqlite_master WHERE type='table';"
wrangler d1 execute slyxup_auth --remote --command "SELECT count(*) FROM users;"
```

**Commit BOTH**: `src/lib/schema.ts` + `migrations/*.sql` + `migrations/meta/_journal.json`.

If you skip generate, DB and schema drift — AI must never edit `migrations/` manually except via `drizzle-kit generate`.

## 4. Migrations folder layout

```
auth.slyxup.online/
├── src/lib/schema.ts          ← source of truth
├── drizzle.config.ts
└── migrations/
    ├── 0000_initial.sql
    ├── 0001_add_sessions.sql
    ├── meta/
    │   ├── _journal.json
    │   └── 0000_snapshot.json
    └── .gitkeep
```

Root `stack/migrations/` is legacy (Postgres) — D1 migrations live per-domain: `auth.slyxup.online/migrations/`, `billing.slyxup.online/migrations/`.

## 5. D1 runtime usage (Workers)

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './lib/schema';
import { eq } from 'drizzle-orm';

export default {
  async fetch(req: Request, env: { DB: D1Database }) {
    const db = drizzle(env.DB, { schema });
    // select
    const users = await db.select().from(schema.users).all(); // User[]
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get(); // User | undefined
    // insert
    await db.insert(schema.users).values({ email: 'a@b.com' });
    // batch (respect 100 param limit)
    const COLS = 5; // columns per row
    const BATCH = Math.floor(100 / COLS);
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(schema.users).values(rows.slice(i, i + BATCH));
    }
    // D1 batch atomic
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, email) VALUES (?1, ?2)').bind(id, email),
    ]);
  }
};
```

`db.query` (relational) needs `defineRelations` on v1 — prefer `db.select()` unless relations defined.

## 6. Common mistakes AI makes

- ❌ Editing `migrations/*.sql` by hand → use `drizzle-kit generate`
- ❌ Running only `--remote` without `--local` → test local first
- ❌ Using `pgTable`/`serial`/`boolean` → use `sqliteTable`/`integer({mode:'boolean'})`
- ❌ Forgetting `pnpm db:generate` after schema edit → DB drift
- ❌ Bulk insert without batching → `D1_ERROR: too many bound parameters`
- ❌ Using `Date` string directly → `integer({mode:'timestamp'})` expects `Date` object
- ❌ Not committing `_journal.json` → next generate fails

## 7. Self-hosting / local dev

```bash
wrangler d1 create slyxup_auth --local
# copy id to wrangler.jsonc d1_databases[0].database_id
pnpm db:generate
pnpm db:migrate:local
wrangler dev  # uses local D1 + .dev.vars
```

Production uses same migration files — `db:migrate:remote` ensures dev/prod parity.

## 8. When to regenerate types

After migration: `wrangler types` → `worker-configuration.d.ts` + `pnpm typecheck`.

---
**AI checklist before PR**:

- [ ] `src/lib/schema.ts` edited with D1-correct types?
- [ ] `pnpm db:generate` run?
- [ ] `pnpm db:migrate:local` + `db:migrate:remote` both run?
- [ ] `worker-configuration.d.ts` regenerated?
- [ ] `pnpm typecheck` passes?
