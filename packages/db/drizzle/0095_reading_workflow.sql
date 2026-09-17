ALTER TABLE `importStagingBookmarks` ADD `readingProgressPercent` integer;--> statement-breakpoint
ALTER TABLE `importStagingBookmarks` ADD `seen` integer;--> statement-breakpoint
ALTER TABLE `userReadingProgress` ADD `seen` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `userReadingProgress` SET `seen` = true;--> statement-breakpoint
ALTER TABLE `user` ADD `autoArchiveFinished` integer DEFAULT false NOT NULL;
