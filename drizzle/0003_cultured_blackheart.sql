CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" "role" DEFAULT 'Member' NOT NULL,
	"image_cld_pub_id" text,
	"user_status" "user_status" DEFAULT 'Pending' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
