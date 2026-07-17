DROP TABLE IF EXISTS "payments" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "financial_dashboards" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "payment_settings" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "members" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "session" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "account" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "verification" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "users" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."member_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."member_role" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."payment_method" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."payment_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."role" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_status" CASCADE;
--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SuperAdmin', 'Admin', 'Member');
--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('Pending', 'Active', 'Inactive', 'Suspended');
--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Pending', 'Approved', 'Rejected', 'NotFound', 'Rechecked');
--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bKash', 'Nagad', 'Bank', 'Cash');
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"password" varchar(255),
	"phone_no" varchar(20),
	"whatsapp_number" varchar(20),
	"img" text,
	"image_cld_pub_id" text,
	"user_status" "user_status" DEFAULT 'Pending' NOT NULL,
	"role" "role" DEFAULT 'Member' NOT NULL,
	"joining_date" timestamp DEFAULT now() NOT NULL,
	"starting_month" date NOT NULL,
	"address" text,
	"location" varchar(255),
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"extra_fine" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_month" integer NOT NULL,
	"payment_year" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"transaction_no" varchar(255),
	"payment_status" "payment_status" DEFAULT 'Pending' NOT NULL,
	"note" text,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_transaction_no_unique" UNIQUE("transaction_no")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_monthly_fee" numeric(12, 2) DEFAULT '10000' NOT NULL,
	"fine_amount" numeric(12, 2) DEFAULT '300' NOT NULL,
	"fine_deadline_day" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_months_active" integer DEFAULT 0 NOT NULL,
	"total_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"account_status" varchar(50) DEFAULT 'Good Standing' NOT NULL,
	"total_pending_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_fine_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pending_months_details" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_dashboards_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "financial_dashboards" ADD CONSTRAINT "financial_dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_month_year_idx" ON "payments" USING btree ("user_id","payment_month","payment_year");
