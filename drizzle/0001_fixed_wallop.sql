CREATE TABLE `credit_monitor_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_checked_at` integer NOT NULL,
	`last_available_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reset_credits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`credit_id` text NOT NULL,
	`event_type` text NOT NULL,
	`reset_type` text NOT NULL,
	`is_supported_by_plan` integer NOT NULL,
	`status` text NOT NULL,
	`granted_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`redeem_started_at` integer,
	`redeemed_at` integer,
	`profile_image_url` text,
	`profile_user_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`detected_at` integer NOT NULL,
	`raw_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reset_credits_credit_id_unique` ON `reset_credits` (`credit_id`);--> statement-breakpoint
CREATE INDEX `reset_credits_event_type_idx` ON `reset_credits` (`event_type`);--> statement-breakpoint
CREATE INDEX `reset_credits_granted_at_idx` ON `reset_credits` (`granted_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_email_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer,
	`reset_credit_id` integer,
	`subscriber_id` integer,
	`email` text NOT NULL,
	`locale` text NOT NULL,
	`status` text NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`provider_message_id` text,
	`error` text,
	`attempted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `usage_snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reset_credit_id`) REFERENCES `reset_credits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_email_deliveries`("id", "snapshot_id", "reset_credit_id", "subscriber_id", "email", "locale", "status", "provider", "provider_message_id", "error", "attempted_at") SELECT "id", "snapshot_id", NULL, "subscriber_id", "email", "locale", "status", "provider", "provider_message_id", "error", "attempted_at" FROM `email_deliveries`;--> statement-breakpoint
DROP TABLE `email_deliveries`;--> statement-breakpoint
ALTER TABLE `__new_email_deliveries` RENAME TO `email_deliveries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `email_deliveries_snapshot_id_idx` ON `email_deliveries` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `email_deliveries_subscriber_id_idx` ON `email_deliveries` (`subscriber_id`);--> statement-breakpoint
CREATE INDEX `email_deliveries_status_idx` ON `email_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `email_deliveries_reset_credit_id_idx` ON `email_deliveries` (`reset_credit_id`);--> statement-breakpoint
ALTER TABLE `job_runs` ADD `reset_credit_id` integer REFERENCES reset_credits(id);--> statement-breakpoint
ALTER TABLE `job_runs` ADD `observed_available_count` integer;--> statement-breakpoint
CREATE INDEX `job_runs_reset_credit_id_idx` ON `job_runs` (`reset_credit_id`);
