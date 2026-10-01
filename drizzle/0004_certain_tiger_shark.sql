CREATE TABLE "password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_credentials_scrypt_check" CHECK ("password_credentials"."password_hash" like '$scrypt$%')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"guest_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_guest_id_unique" UNIQUE("guest_id"),
	CONSTRAINT "users_id_guest_id_unique" UNIQUE("id","guest_id"),
	CONSTRAINT "users_username_check" CHECK ("users"."username" ~ '^[A-Za-z0-9_-]{3,20}$')
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_unique" ON "users" USING btree (lower("username"));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_guest_fk" FOREIGN KEY ("user_id","guest_id") REFERENCES "public"."users"("id","guest_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_guest_id_idx" ON "sessions" USING btree ("guest_id");