CREATE TABLE "room_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_by_guest_id" uuid,
	"used_address_key" text,
	"used_at" timestamp with time zone,
	CONSTRAINT "room_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "room_invitations_use_check" CHECK (("room_invitations"."used_by_guest_id" is null) = ("room_invitations"."used_at" is null))
);
--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_visibility_check";--> statement-breakpoint
ALTER TABLE "room_invitations" ADD CONSTRAINT "room_invitations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invitations" ADD CONSTRAINT "room_invitations_used_by_guest_id_guests_id_fk" FOREIGN KEY ("used_by_guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_invitations_room_id_idx" ON "room_invitations" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_invitations_used_by_guest_id_idx" ON "room_invitations" USING btree ("used_by_guest_id");--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_visibility_check" CHECK ("rooms"."visibility" in ('public', 'unlisted', 'private'));