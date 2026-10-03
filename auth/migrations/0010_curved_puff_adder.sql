CREATE TABLE `auth_challenges` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_challenges_expires_idx` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
DROP INDEX `oauth_accounts_provider_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_accounts_provider_idx` ON `oauth_accounts` (`provider`,`provider_account_id`,`user_id`);