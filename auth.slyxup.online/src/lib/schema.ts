// Drizzle schema for D1 (SQLite) — CF Workers
// Note: D1 has no native BOOLEAN, use integer 0/1, JSON as TEXT
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
// TODO: developers, projects, sessions, accounts, verification_tokens etc. per PLAN.md §8
