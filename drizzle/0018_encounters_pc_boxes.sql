CREATE TABLE "encounter_throws" (
	"encounter_id" uuid NOT NULL,
	"throw_number" integer NOT NULL,
	"caught" boolean NOT NULL,
	"thrown_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_throws_encounter_id_throw_number_pk" PRIMARY KEY("encounter_id","throw_number"),
	CONSTRAINT "encounter_throws_number_check" CHECK ("encounter_throws"."throw_number" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "legendary_grants" (
	"guest_id" uuid NOT NULL,
	"dex" integer NOT NULL,
	"race_id" uuid,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "legendary_grants_guest_id_dex_pk" PRIMARY KEY("guest_id","dex"),
	CONSTRAINT "legendary_grants_dex_check" CHECK ("legendary_grants"."dex" in (144, 145, 146, 150, 151))
);
--> statement-breakpoint
CREATE TABLE "released_pokemon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"dex" integer NOT NULL,
	"level" integer NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "released_pokemon_dex_check" CHECK ("released_pokemon"."dex" between 1 and 151)
);
--> statement-breakpoint
CREATE TABLE "wild_encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"race_id" uuid NOT NULL,
	"dex" integer NOT NULL,
	"level" integer NOT NULL,
	"throws_used" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "wild_encounters_race_guest_unique" UNIQUE("race_id","guest_id"),
	CONSTRAINT "wild_encounters_dex_check" CHECK ("wild_encounters"."dex" between 1 and 151),
	CONSTRAINT "wild_encounters_level_check" CHECK ("wild_encounters"."level" between 1 and 5),
	CONSTRAINT "wild_encounters_throws_check" CHECK ("wild_encounters"."throws_used" between 0 and 3),
	CONSTRAINT "wild_encounters_status_check" CHECK ("wild_encounters"."status" in ('waiting', 'caught', 'fled', 'let-go')),
	CONSTRAINT "wild_encounters_resolved_check" CHECK (("wild_encounters"."status" = 'waiting') = ("wild_encounters"."resolved_at" is null))
);
--> statement-breakpoint
ALTER TABLE "owned_pokemon" DROP CONSTRAINT "owned_pokemon_guest_dex_unique";--> statement-breakpoint
ALTER TABLE "bag_items" DROP CONSTRAINT "bag_items_item_check";--> statement-breakpoint
ALTER TABLE "coin_entries" DROP CONSTRAINT "coin_entries_shape_check";--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "pc_boxes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "encounter_throws" ADD CONSTRAINT "encounter_throws_encounter_id_wild_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."wild_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legendary_grants" ADD CONSTRAINT "legendary_grants_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legendary_grants" ADD CONSTRAINT "legendary_grants_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "released_pokemon" ADD CONSTRAINT "released_pokemon_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_encounters" ADD CONSTRAINT "wild_encounters_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wild_encounters" ADD CONSTRAINT "wild_encounters_participant_fk" FOREIGN KEY ("race_id","guest_id") REFERENCES "public"."race_participants"("race_id","guest_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "released_pokemon_guest_id_idx" ON "released_pokemon" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "wild_encounters_guest_status_idx" ON "wild_encounters" USING btree ("guest_id","status");--> statement-breakpoint
CREATE INDEX "owned_pokemon_guest_id_idx" ON "owned_pokemon" USING btree ("guest_id");--> statement-breakpoint
ALTER TABLE "bag_items" ADD CONSTRAINT "bag_items_item_check" CHECK ("bag_items"."item" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'poke-ball', 'pc-box'));--> statement-breakpoint
ALTER TABLE "coin_entries" ADD CONSTRAINT "coin_entries_shape_check" CHECK (case "coin_entries"."reason"
        when 'race' then "coin_entries"."race_id" is not null and "coin_entries"."amount" >= 0
        when 'badge' then "coin_entries"."badge" is not null and "coin_entries"."amount" > 0
        when 'purchase' then "coin_entries"."purchase_key" is not null and "coin_entries"."item" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'poke-ball', 'pc-box') and "coin_entries"."quantity" > 0 and "coin_entries"."amount" < 0
        else "coin_entries"."amount" > 0 end);--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_pc_boxes_check" CHECK ("guests"."pc_boxes" >= 1);--> statement-breakpoint
UPDATE "guests" SET "pc_boxes" = greatest(1, ceil("owned"."total" / 30.0))::int FROM (SELECT "guest_id", count(*) AS "total" FROM "owned_pokemon" GROUP BY "guest_id") AS "owned" WHERE "owned"."guest_id" = "guests"."id";--> statement-breakpoint
INSERT INTO "legendary_grants" ("guest_id", "dex", "claimed_at") SELECT DISTINCT "guest_id", "dex", now() FROM "owned_pokemon" WHERE "dex" in (144, 145, 146, 150, 151) ON CONFLICT DO NOTHING;
