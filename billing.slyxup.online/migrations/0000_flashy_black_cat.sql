CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`paddle_customer_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text,
	`subscription_id` text,
	`paddle_transaction_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text(3) DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invoice_number` text,
	`billed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`paddle_price_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text(3) DEFAULT 'USD' NOT NULL,
	`interval` text DEFAULT 'month' NOT NULL,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`is_popular` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`paddle_subscription_id` text NOT NULL,
	`paddle_customer_id` text,
	`status` text DEFAULT 'trialing' NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`canceled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`paddle_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`occurred_at` integer,
	`payload` text,
	`processed_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_paddle_customer_id_unique` ON `customers` (`paddle_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_user_idx` ON `customers` (`user_id`);--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_paddle_idx` ON `customers` (`paddle_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_paddle_tx_idx` ON `invoices` (`paddle_transaction_id`);--> statement-breakpoint
CREATE INDEX `invoices_user_idx` ON `invoices` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`project_id`);--> statement-breakpoint
CREATE INDEX `invoices_subscription_idx` ON `invoices` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `plans_project_idx` ON `plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `plans_paddle_price_idx` ON `plans` (`paddle_price_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_paddle_sub_idx` ON `subscriptions` (`paddle_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_project_idx` ON `subscriptions` (`project_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_plan_idx` ON `subscriptions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_event_idx` ON `webhook_events` (`paddle_event_id`);--> statement-breakpoint
CREATE INDEX `webhook_events_type_idx` ON `webhook_events` (`event_type`);