ALTER TABLE "rooms" ADD COLUMN "text_include" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_exclude" text[] DEFAULT '{}'::text[] NOT NULL;