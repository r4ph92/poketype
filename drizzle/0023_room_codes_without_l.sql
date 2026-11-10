-- Open rooms whose code holds an L close as idle before the check stops accepting that letter (#124).
UPDATE "rooms" SET "phase" = 'closed', "close_reason" = 'idle', "revision" = "revision" + 1 WHERE "phase" <> 'closed' AND "code" LIKE '%L%';--> statement-breakpoint
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_code_check";--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_code_check" CHECK ("rooms"."phase" = 'closed' or "rooms"."code" ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');