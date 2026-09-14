CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`parent` text,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_kind` ON `records` (`kind`);--> statement-breakpoint
CREATE INDEX `records_owner` ON `records` (`owner`);--> statement-breakpoint
CREATE INDEX `records_parent` ON `records` (`parent`);