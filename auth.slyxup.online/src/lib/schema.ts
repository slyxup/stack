import { relations } from 'drizzle-orm';
// Drizzle schema for D1 (SQLite) — CF Workers — V1
// D1 quirks: no BOOL/DATETIME (use integer 0/1 + unix seconds), FK always ON, 100 bound params, JSON as TEXT
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ── Developers (platform builders — thin identity link to users)
// DESIGN: Developers are NOT a duplicate users table. The canonical identity
// lives in `users` (email, passwordHash, name, etc.). `developers` is a
// role marker: if a verified user has a row here they can manage projects.
// This avoids duplicating PII and fixes the reported "developer table with
// same data as users" issue. Legacy columns (email, passwordHash, …) are
// kept for migration compat but are deprecated — new code reads from users.
export const developers = sqliteTable(
  'developers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Canonical link — deleting the user cascades the developer role.
    userId: text('user_id')
      .unique()
      .references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
    // ── Deprecated (read from users instead) ──
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
    userIdx: uniqueIndex('developers_user_id_idx').on(t.userId),
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
    // Deprecated JSON list — use `project_domains` table for scalable,
    // indexable per-domain rows (multiple platforms per project). Kept for
    // backwards compat; new code reads project_domains.
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

// ── Project Domains (scalable replacement for projects.allowed_domains JSON)
// Each platform/host gets its own row — indexable, verifiable, unlimited.
export const projectDomains = sqliteTable(
  'project_domains',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(), // e.g. auth.acme.com, no scheme
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectIdx: index('project_domains_project_idx').on(t.projectId),
    domainIdx: uniqueIndex('project_domains_project_domain_idx').on(
      t.projectId,
      t.domain
    ),
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
// Multi-tenant: unique (email, projectId) allows same email across projects
// (handle via D1 UNIQUE index). For global (platform) users, projectId is NULL —
// but for app users, projectId MUST be set (enforced via publishable-key middleware).
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
    /** Optional unique handle per project (sign-in identifier alongside email). */
    username: text('username'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    /** Two-factor authentication (TOTP authenticator app) enabled flag. */
    twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Base32-encoded TOTP secret (plaintext; keep project/system encrypted at rest if hardened). */
    totpSecret: text('totp_secret'),
    role: text('role', { enum: ['user', 'admin'] })
      .notNull()
      .default('user'),
    blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
    blockedReason: text('blocked_reason'),
    // Typed JSON prefs — D1 stores as TEXT
    preferences: text('preferences', { mode: 'json' }).$type<
      Record<string, unknown>
    >(),
    // Soft-delete for auditability with long-lived users
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
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
    usernameIdx: uniqueIndex('users_username_project_idx').on(
      t.username,
      t.projectId
    ),
    projectIdx: index('users_project_idx').on(t.projectId),
    // For paginated project user lists (scalable for millions)
    projectCreatedIdx: index('users_project_created_idx').on(
      t.projectId,
      t.createdAt
    ),
    emailVerifiedIdx: index('users_email_verified_idx').on(t.emailVerified),
    deletedIdx: index('users_deleted_idx').on(t.deletedAt),
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

// ── 2FA Recovery Codes (single-use backups to regain access if authenticator lost) ──
export const recoveryCodes = sqliteTable(
  'recovery_codes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Hashed code (SHA-256 hex). Never store plaintext — same policy as api_keys.
    codeHash: text('code_hash').notNull(),
    // Single-use: true once redeemed.
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userUsedIdx: index('recovery_codes_user_used_idx').on(t.userId, t.used),
  })
);

// ── Sessions (DB-backed, HttpOnly cookie) ──
// Sessions MUST cascade on user delete — otherwise deleted users leave
// orphan tokens (reported bug). FK onDelete cascade handles it, but service
// also deletes explicitly for D1 safety (see user.service:deleteUser).
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
    // Composite for fast expiry cleanup
    userExpiresIdx: index('sessions_user_expires_idx').on(
      t.userId,
      t.expiresAt
    ),
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
// hashedKey is SHA-256 hex of the full key (never store plaintext, never btoa).
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
    // For key rotation / expiry scans
    expiresIdx: index('api_keys_expires_idx').on(t.expiresAt),
  })
);

// ── Relations (query helpers) ──
export const developersRelations = relations(developers, ({ many }) => ({
  projects: many(projects),
  memberships: many(projectMembers),
}));

export const projectDomainsRelations = relations(projectDomains, ({ one }) => ({
  project: one(projects, {
    fields: [projectDomains.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  developer: one(developers, {
    fields: [projects.developerId],
    references: [developers.id],
  }),
  members: many(projectMembers),
  users: many(users),
  apiKeys: many(apiKeys),
  domains: many(projectDomains),
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
  recoveryCodes: many(recoveryCodes),
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

export const recoveryCodesRelations = relations(recoveryCodes, ({ one }) => ({
  user: one(users, { fields: [recoveryCodes.userId], references: [users.id] }),
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
export type RecoveryCode = typeof recoveryCodes.$inferSelect;
export type NewRecoveryCode = typeof recoveryCodes.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// NOTE: Billing tables (plans/subscriptions/invoices) live ONLY in
// billing.slyxup.online (D1 slyxup_billing). Auth owns identity only.

// ── Audit Logs ──
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action', {
      enum: [
        'user.created',
        'user.signed_in',
        'user.signed_out',
        'user.updated',
        'user.deleted',
        'user.blocked',
        'user.unblocked',
        'email.verified',
        'password.reset',
        'password.changed',
        'oauth.linked',
        'key.created',
        'key.revoked',
        'project.created',
      ],
    }).notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<
      Record<string, unknown>
    >(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectIdx: index('audit_logs_project_idx').on(t.projectId),
    userIdx: index('audit_logs_user_idx').on(t.userId),
    actionIdx: index('audit_logs_action_idx').on(t.action),
    // For timeline queries on large tenants
    projectCreatedIdx: index('audit_logs_project_created_idx').on(
      t.projectId,
      t.createdAt
    ),
  })
);

// ── Webhook Endpoints ──
export const webhookEndpoints = sqliteTable(
  'webhook_endpoints',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    events: text('events', { mode: 'json' }).$type<string[]>().default([]),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    projectIdx: index('webhook_endpoints_project_idx').on(t.projectId),
  })
);

export type ProjectDomain = typeof projectDomains.$inferSelect;
export type NewProjectDomain = typeof projectDomains.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;
