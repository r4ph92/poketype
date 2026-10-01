CREATE TABLE "race_participants" (
	"race_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"keystrokes" integer DEFAULT 0 NOT NULL,
	"rejected_keystrokes" integer DEFAULT 0 NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"last_reported_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "race_participants_race_id_guest_id_pk" PRIMARY KEY("race_id","guest_id"),
	CONSTRAINT "race_participants_counters_check" CHECK ("race_participants"."position" >= 0 and "race_participants"."keystrokes" >= 0 and "race_participants"."rejected_keystrokes" >= 0 and "race_participants"."last_sequence" >= 0),
	CONSTRAINT "race_participants_rejected_check" CHECK ("race_participants"."keystrokes" >= "race_participants"."rejected_keystrokes"),
	CONSTRAINT "race_participants_position_check" CHECK ("race_participants"."keystrokes" - "race_participants"."rejected_keystrokes" >= "race_participants"."position")
);
--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_participants_guest_id_idx" ON "race_participants" USING btree ("guest_id");