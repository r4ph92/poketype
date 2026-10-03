ALTER TABLE "bag_items" DROP CONSTRAINT "bag_items_item_check";--> statement-breakpoint
ALTER TABLE "coin_entries" DROP CONSTRAINT "coin_entries_shape_check";--> statement-breakpoint
ALTER TABLE "owned_pokemon" DROP CONSTRAINT "owned_pokemon_dex_check";--> statement-breakpoint
ALTER TABLE "race_participants" DROP CONSTRAINT "race_participants_partner_dex_check";--> statement-breakpoint
ALTER TABLE "released_pokemon" DROP CONSTRAINT "released_pokemon_dex_check";--> statement-breakpoint
ALTER TABLE "stone_evolutions" DROP CONSTRAINT "stone_evolutions_stone_check";--> statement-breakpoint
ALTER TABLE "stone_evolutions" DROP CONSTRAINT "stone_evolutions_dex_check";--> statement-breakpoint
ALTER TABLE "wild_encounters" DROP CONSTRAINT "wild_encounters_dex_check";--> statement-breakpoint
ALTER TABLE "xp_grants" DROP CONSTRAINT "xp_grants_dex_check";--> statement-breakpoint
ALTER TABLE "bag_items" ADD CONSTRAINT "bag_items_item_check" CHECK ("bag_items"."item" in ('poke-ball', 'pc-box', 'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'metal-coat', 'kings-rock', 'dragon-scale', 'up-grade', 'dubious-disc', 'protector', 'electirizer', 'magmarizer', 'reaper-cloth', 'razor-claw', 'razor-fang', 'oval-stone', 'deep-sea-tooth', 'deep-sea-scale', 'prism-scale'));--> statement-breakpoint
ALTER TABLE "coin_entries" ADD CONSTRAINT "coin_entries_shape_check" CHECK (case "coin_entries"."reason"
        when 'race' then "coin_entries"."race_id" is not null and "coin_entries"."amount" >= 0
        when 'badge' then "coin_entries"."badge" is not null and "coin_entries"."amount" > 0
        when 'purchase' then "coin_entries"."purchase_key" is not null and "coin_entries"."item" in ('poke-ball', 'pc-box', 'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'metal-coat', 'kings-rock', 'dragon-scale', 'up-grade', 'dubious-disc', 'protector', 'electirizer', 'magmarizer', 'reaper-cloth', 'razor-claw', 'razor-fang', 'oval-stone', 'deep-sea-tooth', 'deep-sea-scale', 'prism-scale') and "coin_entries"."quantity" > 0 and "coin_entries"."amount" < 0
        else "coin_entries"."amount" > 0 end);--> statement-breakpoint
ALTER TABLE "owned_pokemon" ADD CONSTRAINT "owned_pokemon_dex_check" CHECK ("owned_pokemon"."dex" between 1 and 649);--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_partner_dex_check" CHECK ("race_participants"."partner_dex" between 1 and 649);--> statement-breakpoint
ALTER TABLE "released_pokemon" ADD CONSTRAINT "released_pokemon_dex_check" CHECK ("released_pokemon"."dex" between 1 and 649);--> statement-breakpoint
ALTER TABLE "stone_evolutions" ADD CONSTRAINT "stone_evolutions_stone_check" CHECK ("stone_evolutions"."stone" in ('fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'metal-coat', 'kings-rock', 'dragon-scale', 'up-grade', 'dubious-disc', 'protector', 'electirizer', 'magmarizer', 'reaper-cloth', 'razor-claw', 'razor-fang', 'oval-stone', 'deep-sea-tooth', 'deep-sea-scale', 'prism-scale'));--> statement-breakpoint
ALTER TABLE "stone_evolutions" ADD CONSTRAINT "stone_evolutions_dex_check" CHECK ("stone_evolutions"."dex_before" between 1 and 649 and "stone_evolutions"."dex_after" between 1 and 649);--> statement-breakpoint
ALTER TABLE "wild_encounters" ADD CONSTRAINT "wild_encounters_dex_check" CHECK ("wild_encounters"."dex" between 1 and 649);--> statement-breakpoint
ALTER TABLE "xp_grants" ADD CONSTRAINT "xp_grants_dex_check" CHECK ("xp_grants"."dex_before" between 1 and 649 and "xp_grants"."dex_after" between 1 and 649);