ALTER TABLE `projects` ADD `environment` text DEFAULT 'test' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `allowed_domains` text DEFAULT '[]';