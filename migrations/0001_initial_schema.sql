CREATE TABLE `app_state` (
  `id` integer PRIMARY KEY NOT NULL,
  `version` integer DEFAULT 0 NOT NULL,
  `owner` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imports` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `filename` text NOT NULL,
  `status` text NOT NULL,
  `count` integer NOT NULL,
  `created_at` text NOT NULL,
  `completed_at` text,
  `summary` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_records` (
  `kind` text NOT NULL,
  `record_key` text NOT NULL,
  `payload` text NOT NULL,
  `import_id` text NOT NULL,
  PRIMARY KEY(`kind`, `record_key`)
);
--> statement-breakpoint
CREATE TABLE `staged_rows` (
  `import_id` text NOT NULL,
  `record_key` text NOT NULL,
  `payload` text NOT NULL,
  PRIMARY KEY(`import_id`, `record_key`)
);
