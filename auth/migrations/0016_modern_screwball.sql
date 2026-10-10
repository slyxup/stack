ALTER TABLE `sessions` ADD `refresh_token` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `refresh_expires_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_idx` ON `sessions` (`refresh_token`);