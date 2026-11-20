CREATE TABLE "oauth_identities" (
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_identities_pkey" PRIMARY KEY("provider","provider_user_id"),
	CONSTRAINT "oauth_identities_user_id_provider_unique" UNIQUE("user_id","provider"),
	CONSTRAINT "oauth_identities_provider_check" CHECK ("oauth_identities"."provider" in ('github', 'discord')),
	CONSTRAINT "oauth_identities_provider_user_id_check" CHECK (char_length("oauth_identities"."provider_user_id") between 1 and 64)
);
--> statement-breakpoint
ALTER TABLE "oauth_identities" ADD CONSTRAINT "oauth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;