CREATE TABLE "race_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"guest_id" uuid,
	"bot_character" text,
	"checkpoint" integer NOT NULL,
	"kind" text NOT NULL,
	"words_removed" integer NOT NULL,
	"awarded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "race_bonuses_one_racer_check" CHECK (("race_bonuses"."guest_id" is null) <> ("race_bonuses"."bot_character" is null)),
	CONSTRAINT "race_bonuses_bot_character_check" CHECK ("race_bonuses"."bot_character" in ('brock', 'misty', 'falkner', 'bugsy', 'roxanne', 'brawly', 'roark', 'gardenia', 'cilan', 'chili', 'cress', 'lenora', 'lt-surge', 'erika', 'whitney', 'morty', 'wattson', 'flannery', 'maylene', 'crasher-wake', 'burgh', 'elesa', 'koga', 'sabrina', 'chuck', 'jasmine', 'norman', 'winona', 'fantina', 'byron', 'clay', 'skyla', 'blaine', 'pryce', 'clair', 'tate-and-liza', 'wallace', 'candice', 'volkner', 'brycen', 'drayden', 'archer', 'ariana', 'tabitha', 'mars', 'jupiter', 'saturn', 'giovanni', 'maxie', 'archie', 'cyrus', 'ghetsis', 'n')),
	CONSTRAINT "race_bonuses_checkpoint_check" CHECK ("race_bonuses"."checkpoint" in (25, 50, 75)),
	CONSTRAINT "race_bonuses_kind_check" CHECK ("race_bonuses"."kind" in ('remove-words')),
	CONSTRAINT "race_bonuses_words_removed_check" CHECK ("race_bonuses"."words_removed" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "catch_up_bonuses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "bonus_checkpoints_passed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "catch_up_bonuses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "race_bonuses" ADD CONSTRAINT "race_bonuses_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_bonuses" ADD CONSTRAINT "race_bonuses_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_bonuses_race_id_idx" ON "race_bonuses" USING btree ("race_id");--> statement-breakpoint
CREATE UNIQUE INDEX "race_bonuses_player_checkpoint_unique" ON "race_bonuses" USING btree ("race_id","guest_id","checkpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "race_bonuses_bot_checkpoint_unique" ON "race_bonuses" USING btree ("race_id","bot_character","checkpoint");--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_bonus_checkpoints_check" CHECK ("races"."bonus_checkpoints_passed" between 0 and 3);