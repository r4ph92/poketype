ALTER TABLE "race_participants" ADD COLUMN "correct_characters_by_second" jsonb;--> statement-breakpoint
-- Added without a default first, so races settled before #147 keep null (not recorded) instead of an empty timeline.
ALTER TABLE "race_participants" ALTER COLUMN "correct_characters_by_second" SET DEFAULT '[]'::jsonb;
