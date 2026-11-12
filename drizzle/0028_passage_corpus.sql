CREATE TABLE "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"language" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"length" integer NOT NULL,
	"word_count" integer NOT NULL,
	"complexity" integer NOT NULL,
	CONSTRAINT "passages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "passages_length_check" CHECK ("passages"."length" > 0),
	CONSTRAINT "passages_language_check" CHECK ("passages"."language" in ('fr', 'en'))
);
--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "passage_id" uuid;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "text_kind" text DEFAULT 'random' NOT NULL;--> statement-breakpoint
CREATE INDEX "passages_language_idx" ON "passages" USING btree ("language");--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_text_kind_check" CHECK ("rooms"."text_kind" in ('random', 'coherent'));