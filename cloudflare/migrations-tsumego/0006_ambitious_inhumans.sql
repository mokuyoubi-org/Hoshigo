DROP TABLE `tsumego_attempts`;--> statement-breakpoint
ALTER TABLE `tsumego_user_states` ADD `status` text;--> statement-breakpoint
ALTER TABLE `tsumego_user_states` ADD `solved_at` integer;--> statement-breakpoint
ALTER TABLE `tsumego_user_states` DROP COLUMN `skipped`;