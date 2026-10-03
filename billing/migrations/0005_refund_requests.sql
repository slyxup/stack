CREATE TABLE `refund_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `project_id` text NOT NULL,
  `invoice_id` text NOT NULL,
  `paddle_transaction_id` text NOT NULL,
  `amount` integer NOT NULL,
  `currency` text DEFAULT 'USD' NOT NULL,
  `reason` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `paddle_adjustment_id` text,
  `admin_note` text,
  `decided_by` text,
  `requested_at` integer NOT NULL,
  `decided_at` integer,
  `refunded_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refund_requests_user_idx` ON `refund_requests` (`user_id`);
--> statement-breakpoint
CREATE INDEX `refund_requests_project_idx` ON `refund_requests` (`project_id`);
--> statement-breakpoint
CREATE INDEX `refund_requests_invoice_idx` ON `refund_requests` (`invoice_id`);
--> statement-breakpoint
CREATE INDEX `refund_requests_status_idx` ON `refund_requests` (`status`);
