CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"passage" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "races_passage_not_empty" CHECK (length("races"."passage") > 0)
);
--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "races_room_id_created_at_idx" ON "races" USING btree ("room_id","created_at");