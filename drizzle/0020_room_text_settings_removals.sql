CREATE TABLE "room_removals" (
	"room_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"removed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_removals_room_id_guest_id_pk" PRIMARY KEY("room_id","guest_id")
);
--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "inactive_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "text_language" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_language" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_length" integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_punctuation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_accents" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_capitals" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_digits" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "room_removals" ADD CONSTRAINT "room_removals_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_removals" ADD CONSTRAINT "room_removals_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_removals_guest_id_idx" ON "room_removals" USING btree ("guest_id");--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_inactive_alone_check" CHECK ("race_participants"."inactive_at" is null or ("race_participants"."finished_at" is null and "race_participants"."abandoned_at" is null));--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_text_language_check" CHECK ("races"."text_language" in ('fr', 'en'));--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_text_language_check" CHECK ("rooms"."text_language" in ('fr', 'en'));--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_text_length_check" CHECK ("rooms"."text_length" between 100 and 800);