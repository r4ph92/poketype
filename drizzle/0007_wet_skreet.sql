ALTER TABLE "race_participants" ADD COLUMN "gross_wpm" double precision;--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "score" double precision;--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "accuracy" double precision;--> statement-breakpoint
ALTER TABLE "race_participants" ADD COLUMN "place" integer;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "rules_version" integer;--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_settled_together_check" CHECK (("race_participants"."gross_wpm" is null) = ("race_participants"."score" is null) and ("race_participants"."score" is null) = ("race_participants"."accuracy" is null) and ("race_participants"."accuracy" is null) = ("race_participants"."place" is null));--> statement-breakpoint
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_results_range_check" CHECK ("race_participants"."place" >= 1 and "race_participants"."accuracy" between 0 and 1 and "race_participants"."gross_wpm" >= 0 and "race_participants"."score" >= 0);--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_ended_after_start_check" CHECK ("races"."ended_at" is null or "races"."ended_at" >= "races"."starts_at");--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_settled_with_rules_check" CHECK (("races"."ended_at" is null) = ("races"."rules_version" is null));