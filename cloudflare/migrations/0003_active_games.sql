CREATE TABLE `active_games` (
	`uid` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`board_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `profiles`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `active_games_game_idx` ON `active_games` (`game_id`);