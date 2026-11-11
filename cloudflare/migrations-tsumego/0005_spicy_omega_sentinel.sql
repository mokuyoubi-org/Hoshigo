ALTER TABLE `tsumego` ADD `source_no` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `tsumego_source_no_unique` ON `tsumego` (`source_id`,`source_no`);