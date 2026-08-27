CREATE TABLE `project_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`domain` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
/*
 SQLite does not support "Dropping foreign key" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `project_domains_project_idx` ON `project_domains` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_domains_project_domain_idx` ON `project_domains` (`project_id`,`domain`);--> statement-breakpoint
CREATE INDEX `api_keys_expires_idx` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_project_created_idx` ON `audit_logs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `developers_user_id_idx` ON `developers` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_expires_idx` ON `sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `users_project_created_idx` ON `users` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `users_deleted_idx` ON `users` (`deleted_at`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/