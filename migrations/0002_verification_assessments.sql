CREATE TABLE `verification_assessments` (
  `record_key` text PRIMARY KEY NOT NULL,
  `housing_status` text NOT NULL,
  `recommendation` text NOT NULL,
  `criteria` text DEFAULT '{}' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `updated_at` text NOT NULL
);
