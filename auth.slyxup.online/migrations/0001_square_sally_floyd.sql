CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`hashed_key` text NOT NULL,
	`environment` text DEFAULT 'test' NOT NULL,
	`type` text NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `developers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`password_hash` text,
	`name` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`scope` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`developer_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`developer_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bio` text,
	`phone` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX IF EXISTS `users_email_unique`;--> statement-breakpoint
ALTER TABLE `users` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferences` text;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hashed_key_unique` ON `api_keys` (`hashed_key`);--> statement-breakpoint
CREATE INDEX `api_keys_project_idx` ON `api_keys` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hashed_key_idx` ON `api_keys` (`hashed_key`);--> statement-breakpoint
CREATE INDEX `api_keys_prefix_idx` ON `api_keys` (`prefix`);--> statement-breakpoint
CREATE UNIQUE INDEX `developers_email_unique` ON `developers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `developers_email_idx` ON `developers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_accounts_provider_idx` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_idx` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_email_idx` ON `password_reset_tokens` (`email`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_project_developer_idx` ON `project_members` (`project_id`,`developer_id`);--> statement-breakpoint
CREATE INDEX `project_members_developer_idx` ON `project_members` (`developer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_developer_idx` ON `projects` (`developer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_idx` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_project_idx` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_idx` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_idx` ON `verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `verification_tokens_email_idx` ON `verification_tokens` (`email`);--> statement-breakpoint
CREATE INDEX `verification_tokens_expires_idx` ON `verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_project_idx` ON `users` (`email`,`project_id`);--> statement-breakpoint
CREATE INDEX `users_project_idx` ON `users` (`project_id`);--> statement-breakpoint
CREATE INDEX `users_email_verified_idx` ON `users` (`email_verified`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/