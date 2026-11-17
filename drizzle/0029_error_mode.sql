ALTER TABLE "race_participants" DROP CONSTRAINT "race_participants_position_check";--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "correct_characters" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Every race so far was in blocked mode, where every typed character is correct.
UPDATE "race_participants" SET "correct_characters" = "position";
--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "error_mode" text DEFAULT 'blocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "error_mode" text DEFAULT 'blocked' NOT NULL;--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_position_check" CHECK ("race_participants"."position" <= "race_participants"."keystrokes" and "race_participants"."correct_characters" <= "race_participants"."position" and "race_participants"."correct_characters" <= "race_participants"."keystrokes" - "race_participants"."rejected_keystrokes");--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_error_mode_check" CHECK ("rooms"."error_mode" in ('blocked', 'free'));