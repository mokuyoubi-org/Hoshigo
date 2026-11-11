CREATE TABLE `tsumego` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`board_size` integer NOT NULL,
	`black_stones` text DEFAULT '[]' NOT NULL,
	`white_stones` text DEFAULT '[]' NOT NULL,
	`tree` text NOT NULL,
	`created_at` integer NOT NULL
);
