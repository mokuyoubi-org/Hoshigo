PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tsumego` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`board_size` integer NOT NULL,
	`black_stones` text DEFAULT '[]' NOT NULL,
	`white_stones` text DEFAULT '[]' NOT NULL,
	`graph` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tsumego`("id", "type", "board_size", "black_stones", "white_stones", "graph", "created_at", "status") SELECT "id", "type", "board_size", "black_stones", "white_stones", "graph", "created_at", "status" FROM `tsumego`;--> statement-breakpoint
DROP TABLE `tsumego`;--> statement-breakpoint
ALTER TABLE `__new_tsumego` RENAME TO `tsumego`;--> statement-breakpoint
PRAGMA foreign_keys=ON;