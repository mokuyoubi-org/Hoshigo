CREATE TABLE `tsumego_attempts` (
	`user_id` text NOT NULL,
	`tsumego_id` text NOT NULL,
	`solved_date` text NOT NULL,
	`result` text NOT NULL,
	`solved_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `tsumego_id`, `solved_date`)
);
--> statement-breakpoint
CREATE TABLE `tsumego_user_states` (
	`user_id` text NOT NULL,
	`tsumego_id` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`user_id`, `tsumego_id`)
);
--> statement-breakpoint
CREATE TABLE `tsumego_users` (
	`id` text PRIMARY KEY NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`solved_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tsumego` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `tsumego` ADD `author_id` text;--> statement-breakpoint
ALTER TABLE `tsumego` ADD `rating` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tsumego` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `tsumego` ADD `solved_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tsumego` ADD `correct_count` integer DEFAULT 0 NOT NULL;