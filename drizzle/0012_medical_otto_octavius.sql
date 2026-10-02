ALTER TABLE "rooms" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "close_reason" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_close_reason_check" CHECK ("rooms"."close_reason" in ('host-left', 'idle'));--> statement-breakpoint
UPDATE "rooms" SET "close_reason" = 'host-left' WHERE "phase" = 'closed';