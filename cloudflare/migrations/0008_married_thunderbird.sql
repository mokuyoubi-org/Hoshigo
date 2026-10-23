CREATE TABLE `records` (
	`game_id` text PRIMARY KEY NOT NULL,
	`black_uid` text NOT NULL,
	`white_uid` text NOT NULL,
	`board_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`result` text NOT NULL,
	`black_rating` integer NOT NULL,
	`white_rating` integer NOT NULL,
	`match_type` integer NOT NULL,
	`moves` text DEFAULT '[]' NOT NULL,
	`final_ownership` text
);
--> statement-breakpoint
CREATE INDEX `records_black_idx` ON `records` (`black_uid`,`board_size`,`created_at`);--> statement-breakpoint
CREATE INDEX `records_white_idx` ON `records` (`white_uid`,`board_size`,`created_at`);--> statement-breakpoint
DROP TABLE `record_cards`;