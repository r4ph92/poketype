CREATE TABLE "xp_grants" (
	"race_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"xp" integer NOT NULL,
	"dex_before" integer NOT NULL,
	"level_before" integer NOT NULL,
	"xp_before" integer NOT NULL,
	"dex_after" integer NOT NULL,
	"level_after" integer NOT NULL,
	"xp_after" integer NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_grants_race_id_guest_id_pk" PRIMARY KEY("race_id","guest_id"),
	CONSTRAINT "xp_grants_xp_check" CHECK ("xp_grants"."xp" >= 0 and "xp_grants"."xp_before" >= 0 and "xp_grants"."xp_after" >= 0),
	CONSTRAINT "xp_grants_dex_check" CHECK ("xp_grants"."dex_before" between 1 and 151 and "xp_grants"."dex_after" between 1 and 151),
	CONSTRAINT "xp_grants_level_check" CHECK ("xp_grants"."level_before" between 1 and "xp_grants"."level_after" and "xp_grants"."level_after" <= 50)
);
--> statement-breakpoint
ALTER TABLE "xp_grants" ADD CONSTRAINT "xp_grants_participant_fk" FOREIGN KEY ("race_id","guest_id") REFERENCES "public"."race_participants"("race_id","guest_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "xp_grants_guest_id_idx" ON "xp_grants" USING btree ("guest_id");--> statement-breakpoint
-- Every Pokémon restarts at level 1 under the XP rules of docs/PROGRESSION.md; the seed puts ash back at level 50.
UPDATE "owned_pokemon" SET "level" = 1, "xp" = 0;
