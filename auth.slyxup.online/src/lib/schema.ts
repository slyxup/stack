import { relations } from 'drizzle-orm';
// Drizzle schema for D1 (SQLite) — CF Workers — V1
// D1 quirks: no BOOL/DATETIME (use integer 0/1 + unix seconds), FK always ON, 100 bound params, JSON as TEXT
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ── Developers (SlyxUp CLI users, NOT app users) ──
export const developers = sqliteTable(
  'developers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    passwordHash: text('password_hash'),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailIdx: uniqueIndex('developers_email_idx').on(t.email),
  })
);

// ── Projects (per developer, holds users + keys) ──
export const projects = sqliteTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    developerId: text('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    environment: text('environment', { enum: ['test', 'live'] })
      .notNull()
      .default('test'),
    allowedDomains: text('allowed_domains', { mode: 'json' })
      .$type<string[]>()
      .default([]),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    developerIdx: index('projects_developer_idx').on(t.developerId),
    slugIdx: uniqueIndex('projects_slug_idx').on(t.slug),
  })
);

// ── Project Members (team) ──
export const projectMembers = sqliteTable(
  'project_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    developerId: text('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'admin', 'member'] })
      .notNull()
      .default('member'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectDeveloperIdx: uniqueIndex(
      'project_members_project_developer_idx'
    ).on(t.projectId, t.developerId),
    developerIdx: index('project_members_developer_idx').on(t.developerId),
  })
);

// ── Users (app end-users, per project) ──
// Existing table: users(id, email, email_verified, created_at) — expand with defaults for migration safety (0 rows so NOT NULL ok)
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    passwordHash: text('password_hash'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['user', 'admin'] })
      .notNull()
      .default('user'),
    blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
    blockedReason: text('blocked_reason'),
    // Typed JSON prefs — D1 stores as TEXT
    preferences: text('preferences', { mode: 'json' }).$type<
      Record<string, unknown>
    >(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_project_idx').on(t.email, t.projectId),
    projectIdx: index('users_project_idx').on(t.projectId),
    emailVerifiedIdx: index('users_email_verified_idx').on(t.emailVerified),
  })
);

// ── User Profiles (extended) ──
export const userProfiles = sqliteTable(
  'user_profiles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: text('bio'),
    phone: text('phone'),
    metadata: text('metadata', { mode: 'json' }).$type<
      Record<string, unknown>
    >(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdx: uniqueIndex('user_profiles_user_idx').on(t.userId),
  })
);

// ── Sessions (DB-backed, HttpOnly cookie) ──
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tokenIdx: uniqueIndex('sessions_token_idx').on(t.token),
    userIdx: index('sessions_user_idx').on(t.userId),
    projectIdx: index('sessions_project_idx').on(t.projectId),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
  })
);

// ── OAuth Accounts (Google/GitHub) ──
export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['google', 'github'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    providerIdx: uniqueIndex('oauth_accounts_provider_idx').on(
      t.provider,
      t.providerAccountId
    ),
    userIdx: index('oauth_accounts_user_idx').on(t.userId),
  })
);

// ── Verification Tokens (email verify) ──
export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    tokenIdx: uniqueIndex('verification_tokens_token_idx').on(t.token),
    emailIdx: index('verification_tokens_email_idx').on(t.email),
    expiresIdx: index('verification_tokens_expires_idx').on(t.expiresAt),
  })
);

// ── Password Reset Tokens ──
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    tokenIdx: uniqueIndex('password_reset_tokens_token_idx').on(t.token),
    emailIdx: index('password_reset_tokens_email_idx').on(t.email),
    expiresIdx: index('password_reset_tokens_expires_idx').on(t.expiresAt),
  })
);

// ── API Keys (pk_/sk_ test/live) ──
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(), // pk_test_ / pk_live_ / sk_test_ / sk_live_
    hashedKey: text('hashed_key').notNull().unique(),
    environment: text('environment', { enum: ['test', 'live'] })
      .notNull()
      .default('test'),
    type: text('type', { enum: ['publishable', 'secret'] }).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    projectIdx: index('api_keys_project_idx').on(t.projectId),
    hashedKeyIdx: uniqueIndex('api_keys_hashed_key_idx').on(t.hashedKey),
    prefixIdx: index('api_keys_prefix_idx').on(t.prefix),
  })
);

// ── Relations (query helpers) ──
export const developersRelations = relations(developers, ({ many }) => ({
  projects: many(projects),
  memberships: many(projectMembers),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  developer: one(developers, {
    fields: [projects.developerId],
    references: [developers.id],
  }),
  members: many(projectMembers),
  users: many(users),
  apiKeys: many(apiKeys),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  developer: one(developers, {
    fields: [projectMembers.developerId],
    references: [developers.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  project: one(projects, {
    fields: [users.projectId],
    references: [projects.id],
  }),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(sessions),
  oauthAccounts: many(oauthAccounts),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id],
  }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

// ── Type exports ──
export type Developer = typeof developers.$inferSelect;
export type NewDeveloper = typeof developers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OauthAccount = typeof oauthAccounts.$inferSelect;
export type NewOauthAccount = typeof oauthAccounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// ── Billing: Plans ──
export const plans = sqliteTable(
  'plans',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    paddlePriceId: text('paddle_price_id').notNull(),
    amount: integer('amount').notNull(), // cents
    currency: text('currency').notNull().default('USD'),
    interval: text('interval', { enum: ['month', 'year'] })
      .notNull()
      .default('month'),
    trialDays: integer('trial_days').default(0),
    features: text('features', { mode: 'json' }).$type<string[]>().default([]),
    isPopular: integer('is_popular', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectIdx: index('plans_project_idx').on(t.projectId),
  })
);

// ── Billing: Subscriptions ──
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    paddleSubscriptionId: text('paddle_subscription_id').unique(),
    paddleCustomerId: text('paddle_customer_id'),
    status: text('status', {
      enum: ['active', 'trialing', 'past_due', 'paused', 'canceled'],
    })
      .notNull()
      .default('trialing'),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' })
      .notNull()
      .default(false),
    canceledAt: integer('canceled_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdx: index('subscriptions_user_idx').on(t.userId),
    projectIdx: index('subscriptions_project_idx').on(t.projectId),
    paddleSubIdx: uniqueIndex('subscriptions_paddle_sub_idx').on(
      t.paddleSubscriptionId
    ),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  })
);

// ── Billing: Invoices / Payments ──
export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    subscriptionId: text('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    paddleTransactionId: text('paddle_transaction_id'),
    paddleInvoiceId: text('paddle_invoice_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status', {
      enum: ['paid', 'pending', 'overdue', 'refunded'],
    })
      .notNull()
      .default('pending'),
    invoiceNumber: text('invoice_number'),
    billedAt: integer('billed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userInvoiceIdx: index('invoices_user_idx').on(t.userId),
    projectIdx: index('invoices_project_idx').on(t.projectId),
    paddleTxIdx: uniqueIndex('invoices_paddle_tx_idx').on(
      t.paddleTransactionId
    ),
  })
);

// ── Billing relations ──
export const plansRelations = relations(plans, ({ one, many }) => ({
  project: one(projects, {
    fields: [plans.projectId],
    references: [projects.id],
  }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
  project: one(projects, {
    fields: [subscriptions.projectId],
    references: [projects.id],
  }),
}));

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
