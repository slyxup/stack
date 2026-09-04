import { relations } from 'drizzle-orm';
// SlyxUp Billing schema — D1 (SQLite) — billing.slyxup.online
// D1 quirks: no BOOL/DATETIME (integer 0/1 + unix seconds), FK always ON, 100 bound params, JSON as TEXT.
// Cross-DB note: userId/projectId reference tables in slyxup_auth (AUTH_DB binding).
// D1 cannot enforce FKs across databases -> stored as plain text + indexed, integrity via app layer.
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ── Customers (mirror of auth users w/ Paddle id cache) ──
export const customers = sqliteTable(
  'customers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // auth.slyxup.online users.id
    userId: text('user_id').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    paddleCustomerId: text('paddle_customer_id').unique(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdIdx: uniqueIndex('customers_user_idx').on(t.userId),
    emailIdx: index('customers_email_idx').on(t.email),
    paddleIdx: uniqueIndex('customers_paddle_idx').on(t.paddleCustomerId),
  })
);

// ── Plans (per auth project; managed via /v1/admin/plans or CLI) ──
export const plans = sqliteTable(
  'plans',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // auth.slyxup.online projects.id
    projectId: text('project_id').notNull(),
    name: text('name').notNull(),
    paddlePriceId: text('paddle_price_id').notNull(),
    amount: integer('amount').notNull(), // cents
    currency: text('currency', { length: 3 }).notNull().default('USD'),
    interval: text('interval', { enum: ['month', 'year'] })
      .notNull()
      .default('month'),
    trialDays: integer('trial_days').notNull().default(0),
    features: text('features', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    isPopular: integer('is_popular', { mode: 'boolean' })
      .notNull()
      .default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    projectIdx: index('plans_project_idx').on(t.projectId),
    priceIdx: index('plans_paddle_price_idx').on(t.paddlePriceId),
  })
);

// ── Subscriptions (synced from Paddle webhooks) ──
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull(),
    userId: text('user_id').notNull(),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    paddleSubscriptionId: text('paddle_subscription_id').notNull(),
    paddleCustomerId: text('paddle_customer_id'),
    status: text('status', {
      enum: ['active', 'trialing', 'past_due', 'paused', 'canceled'],
    })
      .notNull()
      .default('trialing'),
    currentPeriodStart: integer('current_period_start', {
      mode: 'timestamp',
    }),
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
    paddleSubIdx: uniqueIndex('subscriptions_paddle_sub_idx').on(
      t.paddleSubscriptionId
    ),
    userIdx: index('subscriptions_user_idx').on(t.userId),
    projectIdx: index('subscriptions_project_idx').on(t.projectId),
    planIdx: index('subscriptions_plan_idx').on(t.planId),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  })
);

// ── Invoices / payments (from transaction.completed webhooks) ──
export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull(),
    userId: text('user_id'),
    subscriptionId: text('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    paddleTransactionId: text('paddle_transaction_id').notNull(),
    amount: integer('amount').notNull(), // cents
    currency: text('currency', { length: 3 }).notNull().default('USD'),
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
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    paddleTxIdx: uniqueIndex('invoices_paddle_tx_idx').on(
      t.paddleTransactionId
    ),
    userIdx: index('invoices_user_idx').on(t.userId),
    projectIdx: index('invoices_project_idx').on(t.projectId),
    subIdx: index('invoices_subscription_idx').on(t.subscriptionId),
  })
);

// ── Webhook events (Paddle delivery log, idempotency guard) ──
export const webhookEvents = sqliteTable(
  'webhook_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    paddleEventId: text('paddle_event_id').notNull(),
    eventType: text('event_type').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    processedAt: integer('processed_at', { mode: 'timestamp' }),
    status: text('status', { enum: ['pending', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    eventIdx: uniqueIndex('webhook_events_event_idx').on(t.paddleEventId),
    typeIdx: index('webhook_events_type_idx').on(t.eventType),
  })
);

// ── Relations ──
export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    plan: one(plans, {
      fields: [subscriptions.planId],
      references: [plans.id],
    }),
    invoices: many(invoices),
  })
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// ── Type exports ──
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
