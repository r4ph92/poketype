CREATE TABLE "race_bots" (
	"race_id" uuid NOT NULL,
	"character" text NOT NULL,
	"level" text NOT NULL,
	"seed" integer NOT NULL,
	"position" integer,
	"keystrokes" integer,
	"rejected_keystrokes" integer,
	"finished_at" timestamp with time zone,
	"gross_wpm" double precision,
	"score" double precision,
	"accuracy" double precision,
	"place" integer,
	CONSTRAINT "race_bots_race_id_character_pk" PRIMARY KEY("race_id","character"),
	CONSTRAINT "race_bots_character_check" CHECK ("race_bots"."character" in ('brock', 'misty', 'falkner', 'bugsy', 'roxanne', 'brawly', 'roark', 'gardenia', 'cilan', 'chili', 'cress', 'lenora', 'lt-surge', 'erika', 'whitney', 'morty', 'wattson', 'flannery', 'maylene', 'crasher-wake', 'burgh', 'elesa', 'koga', 'sabrina', 'chuck', 'jasmine', 'norman', 'winona', 'fantina', 'byron', 'clay', 'skyla', 'blaine', 'pryce', 'clair', 'tate-and-liza', 'wallace', 'candice', 'volkner', 'brycen', 'drayden', 'archer', 'ariana', 'tabitha', 'mars', 'jupiter', 'saturn', 'giovanni', 'maxie', 'archie', 'cyrus', 'ghetsis', 'n')),
	CONSTRAINT "race_bots_level_check" CHECK ("race_bots"."level" in ('beginner', 'easy', 'medium', 'hard', 'expert')),
	CONSTRAINT "race_bots_seed_check" CHECK ("race_bots"."seed" >= 0),
	CONSTRAINT "race_bots_settled_together_check" CHECK (("race_bots"."place" is null) = ("race_bots"."position" is null) and ("race_bots"."place" is null) = ("race_bots"."keystrokes" is null) and ("race_bots"."place" is null) = ("race_bots"."rejected_keystrokes" is null) and ("race_bots"."place" is null) = ("race_bots"."gross_wpm" is null) and ("race_bots"."place" is null) = ("race_bots"."score" is null) and ("race_bots"."place" is null) = ("race_bots"."accuracy" is null)),
	CONSTRAINT "race_bots_results_range_check" CHECK ("race_bots"."place" >= 1 and "race_bots"."accuracy" between 0 and 1 and "race_bots"."gross_wpm" >= 0 and "race_bots"."score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "room_bots" (
	"room_id" uuid NOT NULL,
	"character" text NOT NULL,
	"level" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_bots_room_id_character_pk" PRIMARY KEY("room_id","character"),
	CONSTRAINT "room_bots_character_check" CHECK ("room_bots"."character" in ('brock', 'misty', 'falkner', 'bugsy', 'roxanne', 'brawly', 'roark', 'gardenia', 'cilan', 'chili', 'cress', 'lenora', 'lt-surge', 'erika', 'whitney', 'morty', 'wattson', 'flannery', 'maylene', 'crasher-wake', 'burgh', 'elesa', 'koga', 'sabrina', 'chuck', 'jasmine', 'norman', 'winona', 'fantina', 'byron', 'clay', 'skyla', 'blaine', 'pryce', 'clair', 'tate-and-liza', 'wallace', 'candice', 'volkner', 'brycen', 'drayden', 'archer', 'ariana', 'tabitha', 'mars', 'jupiter', 'saturn', 'giovanni', 'maxie', 'archie', 'cyrus', 'ghetsis', 'n')),
	CONSTRAINT "room_bots_level_check" CHECK ("room_bots"."level" in ('beginner', 'easy', 'medium', 'hard', 'expert'))
);
--> statement-breakpoint
ALTER TABLE "race_bots" ADD CONSTRAINT "race_bots_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bots" ADD CONSTRAINT "room_bots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;