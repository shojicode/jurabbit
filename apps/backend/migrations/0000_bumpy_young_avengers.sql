CREATE TABLE `horses` (
	`horse_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`info` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`race_id` integer NOT NULL,
	`horse_id` integer NOT NULL,
	`rank` integer NOT NULL,
	PRIMARY KEY(`race_id`, `horse_id`)
);
--> statement-breakpoint
CREATE TABLE `user_predictions` (
	`user_id` text NOT NULL,
	`race_id` integer NOT NULL,
	`first_choice` integer NOT NULL,
	`second_choice` integer,
	`third_choice` integer,
	PRIMARY KEY(`user_id`, `race_id`)
);
