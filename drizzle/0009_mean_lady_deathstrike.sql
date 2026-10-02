ALTER TABLE "races" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
UPDATE "races" SET "deadline_at" = "starts_at" + interval '180 seconds';--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "deadline_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_deadline_after_start_check" CHECK ("races"."deadline_at" > "races"."starts_at");
