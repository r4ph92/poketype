ALTER TABLE "race_participants" ADD COLUMN "missed_characters" jsonb;--> statement-breakpoint
-- Added without a default first, so races settled before #74 keep null (not recorded) instead of an empty record.
ALTER TABLE "race_participants" ALTER COLUMN "missed_characters" SET DEFAULT '{}'::jsonb;
