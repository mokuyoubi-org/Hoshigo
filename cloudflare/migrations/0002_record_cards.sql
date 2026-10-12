CREATE TABLE `record_cards` (
	`uid` text NOT NULL,
	`game_id` text NOT NULL,
	`board_size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`color` text NOT NULL,
	`opp_uid` text NOT NULL,
	`result` text NOT NULL,
	`rating` integer NOT NULL,
	`opp_rating` integer NOT NULL,
	`match_type` integer NOT NULL,
	PRIMARY KEY(`uid`, `game_id`),
	FOREIGN KEY (`uid`) REFERENCES `profiles`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `record_cards_list_idx` ON `record_cards` (`uid`,`board_size`,`created_at`);