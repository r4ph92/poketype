CREATE TABLE "room_code_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "code" text;--> statement-breakpoint
CREATE FUNCTION pg_temp.random_room_code() RETURNS text LANGUAGE sql VOLATILE AS $$
	SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') FROM generate_series(1, 6)
$$;--> statement-breakpoint
UPDATE "rooms" SET "code" = pg_temp.random_room_code();--> statement-breakpoint
DO $$
BEGIN
	WHILE EXISTS (SELECT 1 FROM "rooms" GROUP BY "code" HAVING count(*) > 1) LOOP
		UPDATE "rooms" SET "code" = pg_temp.random_room_code()
		WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (PARTITION BY "code" ORDER BY "id") AS "rank" FROM "rooms") AS "ranked" WHERE "rank" > 1);
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "room_code_failures" ADD CONSTRAINT "room_code_failures_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_code_failures_guest_id_failed_at_idx" ON "room_code_failures" USING btree ("guest_id","failed_at");--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_code_check" CHECK ("rooms"."code" ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_visibility_check" CHECK ("rooms"."visibility" in ('public', 'unlisted'));