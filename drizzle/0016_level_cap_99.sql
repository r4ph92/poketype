ALTER TABLE "owned_pokemon" DROP CONSTRAINT "owned_pokemon_level_check";--> statement-breakpoint
ALTER TABLE "xp_grants" DROP CONSTRAINT "xp_grants_level_check";--> statement-breakpoint
ALTER TABLE "owned_pokemon" ADD CONSTRAINT "owned_pokemon_level_check" CHECK ("owned_pokemon"."level" between 1 and 99);--> statement-breakpoint
ALTER TABLE "xp_grants" ADD CONSTRAINT "xp_grants_level_check" CHECK ("xp_grants"."level_before" between 1 and "xp_grants"."level_after" and "xp_grants"."level_after" <= 99);