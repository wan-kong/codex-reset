CREATE TABLE `email_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` integer NOT NULL,
	`subscriber_id` integer,
	`email` text NOT NULL,
	`locale` text NOT NULL,
	`status` text NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`provider_message_id` text,
	`error` text,
	`attempted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `usage_snapshots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `email_deliveries_snapshot_id_idx` ON `email_deliveries` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `email_deliveries_subscriber_id_idx` ON `email_deliveries` (`subscriber_id`);--> statement-breakpoint
CREATE INDEX `email_deliveries_status_idx` ON `email_deliveries` (`status`);--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`status` text NOT NULL,
	`triggered_reset` integer DEFAULT false NOT NULL,
	`observed_secondary_reset_at` integer,
	`snapshot_id` integer,
	`message` text,
	`error` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `usage_snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `job_runs_started_at_idx` ON `job_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `job_runs_status_idx` ON `job_runs` (`status`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`unsubscribe_token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`unsubscribed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_unsubscribe_token_unique` ON `subscribers` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `subscribers_status_idx` ON `subscribers` (`status`);--> statement-breakpoint
CREATE INDEX `subscribers_locale_idx` ON `subscribers` (`locale`);--> statement-breakpoint
CREATE TABLE `usage_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text DEFAULT 'reset' NOT NULL,
	`secondary_reset_at` integer NOT NULL,
	`primary_reset_at` integer,
	`requested_at` integer NOT NULL,
	`account_hash` text,
	`account_email_masked` text,
	`plan_type` text,
	`raw_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_snapshots_secondary_reset_at_idx` ON `usage_snapshots` (`secondary_reset_at`);--> statement-breakpoint
CREATE INDEX `usage_snapshots_event_type_idx` ON `usage_snapshots` (`event_type`);
