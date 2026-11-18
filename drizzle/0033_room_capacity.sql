ALTER TABLE "rooms" ADD COLUMN "capacity" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_capacity_check" CHECK ("rooms"."capacity" between 2 and 30);