CREATE TABLE `app_status` (
	`id` integer PRIMARY KEY NOT NULL,
	`maintenance` integer DEFAULT false NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`app_version` text,
	`ota_version` text
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`uid` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`icon_index` integer DEFAULT 0 NOT NULL,
	`country` text,
	`is_bot` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_seen` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`uid` text NOT NULL,
	`board_size` integer NOT NULL,
	`allow_bot_match` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`uid`, `board_size`),
	FOREIGN KEY (`uid`) REFERENCES `profiles`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`uid` text NOT NULL,
	`board_size` integer NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`giant_killing_streak` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`highest_rating` integer DEFAULT 0 NOT NULL,
	`win_streak` integer DEFAULT 0 NOT NULL,
	`daily_play_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`uid`, `board_size`),
	FOREIGN KEY (`uid`) REFERENCES `profiles`(`uid`) ON UPDATE no action ON DELETE cascade
);
