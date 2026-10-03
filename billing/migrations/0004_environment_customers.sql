ALTER TABLE `customers` ADD `paddle_test_customer_id` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD `paddle_live_customer_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_paddle_test_customer_idx` ON `customers` (`paddle_test_customer_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_paddle_live_customer_idx` ON `customers` (`paddle_live_customer_id`);
