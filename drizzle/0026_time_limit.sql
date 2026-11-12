ALTER TABLE "races" ADD COLUMN "time_limit_seconds" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "time_limit_seconds" integer DEFAULT 300;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_time_limit_check" CHECK ("rooms"."time_limit_seconds" is null or ("rooms"."time_limit_seconds" between 30 and 600 and ("rooms"."time_limit_seconds" - 30) % 30 = 0));--> statement-breakpoint
-- Races already created keep the limit they were given, so a race running during the deploy still shows its countdown.
UPDATE "races" SET "time_limit_seconds" = extract(epoch from "deadline_at" - "starts_at")::integer;