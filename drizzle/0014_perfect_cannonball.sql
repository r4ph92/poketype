CREATE TABLE "earned_badges" (
	"guest_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"race_id" uuid,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "earned_badges_guest_id_badge_pk" PRIMARY KEY("guest_id","badge"),
	CONSTRAINT "earned_badges_badge_check" CHECK ("earned_badges"."badge" in ('boulder', 'cascade', 'thunder', 'rainbow', 'soul', 'marsh', 'volcano', 'earth'))
);
--> statement-breakpoint
CREATE TABLE "owned_pokemon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"dex" integer NOT NULL,
	"level" integer NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"is_partner" boolean DEFAULT false NOT NULL,
	"caught_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owned_pokemon_guest_dex_unique" UNIQUE("guest_id","dex"),
	CONSTRAINT "owned_pokemon_dex_check" CHECK ("owned_pokemon"."dex" between 1 and 151),
	CONSTRAINT "owned_pokemon_level_check" CHECK ("owned_pokemon"."level" between 1 and 50),
	CONSTRAINT "owned_pokemon_xp_check" CHECK ("owned_pokemon"."xp" >= 0)
);
--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "partner_dex" integer;--> statement-breakpoint
ALTER TABLE "earned_badges" ADD CONSTRAINT "earned_badges_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earned_badges" ADD CONSTRAINT "earned_badges_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owned_pokemon" ADD CONSTRAINT "owned_pokemon_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "owned_pokemon_one_partner_unique" ON "owned_pokemon" USING btree ("guest_id") WHERE "owned_pokemon"."is_partner";--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_partner_dex_check" CHECK ("race_participants"."partner_dex" between 1 and 151);