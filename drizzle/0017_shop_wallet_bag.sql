CREATE TABLE "bag_items" (
	"guest_id" uuid NOT NULL,
	"item" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "bag_items_guest_id_item_pk" PRIMARY KEY("guest_id","item"),
	CONSTRAINT "bag_items_item_check" CHECK ("bag_items"."item" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'poke-ball')),
	CONSTRAINT "bag_items_quantity_check" CHECK ("bag_items"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "coin_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"amount" integer NOT NULL,
	"race_id" uuid,
	"badge" text,
	"purchase_key" uuid,
	"item" text,
	"quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coin_entries_reason_check" CHECK ("coin_entries"."reason" in ('race', 'badge', 'purchase', 'seed')),
	CONSTRAINT "coin_entries_shape_check" CHECK (case "coin_entries"."reason"
        when 'race' then "coin_entries"."race_id" is not null and "coin_entries"."amount" >= 0
        when 'badge' then "coin_entries"."badge" is not null and "coin_entries"."amount" > 0
        when 'purchase' then "coin_entries"."purchase_key" is not null and "coin_entries"."item" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'poke-ball') and "coin_entries"."quantity" > 0 and "coin_entries"."amount" < 0
        else "coin_entries"."amount" > 0 end)
);
--> statement-breakpoint
CREATE TABLE "stone_evolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"stone" text NOT NULL,
	"dex_before" integer NOT NULL,
	"dex_after" integer NOT NULL,
	"evolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stone_evolutions_stone_check" CHECK ("stone_evolutions"."stone" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone')),
	CONSTRAINT "stone_evolutions_dex_check" CHECK ("stone_evolutions"."dex_before" between 1 and 151 and "stone_evolutions"."dex_after" between 1 and 151)
);
--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bag_items" ADD CONSTRAINT "bag_items_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_entries" ADD CONSTRAINT "coin_entries_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_entries" ADD CONSTRAINT "coin_entries_participant_fk" FOREIGN KEY ("race_id","guest_id") REFERENCES "public"."race_participants"("race_id","guest_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stone_evolutions" ADD CONSTRAINT "stone_evolutions_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coin_entries_guest_id_idx" ON "coin_entries" USING btree ("guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_entries_race_unique" ON "coin_entries" USING btree ("race_id","guest_id") WHERE "coin_entries"."reason" = 'race';--> statement-breakpoint
CREATE UNIQUE INDEX "coin_entries_badge_unique" ON "coin_entries" USING btree ("guest_id","badge") WHERE "coin_entries"."reason" = 'badge';--> statement-breakpoint
CREATE UNIQUE INDEX "coin_entries_purchase_unique" ON "coin_entries" USING btree ("guest_id","purchase_key") WHERE "coin_entries"."reason" = 'purchase';--> statement-breakpoint
CREATE INDEX "stone_evolutions_guest_id_idx" ON "stone_evolutions" USING btree ("guest_id");--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_coins_check" CHECK ("guests"."coins" >= 0);