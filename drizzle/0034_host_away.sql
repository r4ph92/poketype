ALTER TABLE "rooms" ADD COLUMN "host_away_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "host_since_at" timestamp with time zone DEFAULT now() NOT NULL;