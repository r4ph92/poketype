ALTER TABLE "rooms" RENAME COLUMN "text_length" TO "text_word_count";--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_text_length_check";--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "text_word_count" SET DEFAULT 40;--> statement-breakpoint
UPDATE "rooms" SET "text_word_count" = 40;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_text_word_count_check" CHECK ("rooms"."text_word_count" between 10 and 150);
