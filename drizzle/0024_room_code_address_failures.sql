CREATE TABLE "room_code_address_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address_key" text NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "room_code_address_failures_address_key_failed_at_idx" ON "room_code_address_failures" USING btree ("address_key","failed_at");