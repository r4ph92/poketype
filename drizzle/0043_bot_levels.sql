ALTER TABLE "race_bots" DROP CONSTRAINT "race_bots_level_check";--> statement-breakpoint
ALTER TABLE "room_bots" DROP CONSTRAINT "room_bots_level_check";--> statement-breakpoint
-- The brief's five levels (#153): each old level keeps its trainers and maps to the level at the same rank, in one statement per table so "expert" is renamed once.
UPDATE "room_bots" SET "level" = CASE "level" WHEN 'beginner' THEN 'noob' WHEN 'easy' THEN 'novice' WHEN 'medium' THEN 'intermediate' WHEN 'hard' THEN 'expert' WHEN 'expert' THEN 'impossible' ELSE "level" END;--> statement-breakpoint
UPDATE "race_bots" SET "level" = CASE "level" WHEN 'beginner' THEN 'noob' WHEN 'easy' THEN 'novice' WHEN 'medium' THEN 'intermediate' WHEN 'hard' THEN 'expert' WHEN 'expert' THEN 'impossible' ELSE "level" END;--> statement-breakpoint
ALTER TABLE "race_bots" ADD CONSTRAINT "race_bots_level_check" CHECK ("race_bots"."level" in ('noob', 'novice', 'intermediate', 'expert', 'impossible'));--> statement-breakpoint
ALTER TABLE "room_bots" ADD CONSTRAINT "room_bots_level_check" CHECK ("room_bots"."level" in ('noob', 'novice', 'intermediate', 'expert', 'impossible'));