CREATE TABLE `checkout_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`paddle_customer_id` text NOT NULL,
	`paddle_transaction_id` text,
	`paddle_subscription_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_intents_paddle_transaction_id_unique` ON `checkout_intents` (`paddle_transaction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_intents_paddle_subscription_id_unique` ON `checkout_intents` (`paddle_subscription_id`);--> statement-breakpoint
ALTER TABLE `invoices` ADD `last_event_at` text;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `last_event_at` text;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `lease_until` integer;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `lease_token` text;