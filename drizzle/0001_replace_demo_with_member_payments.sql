DO $$ BEGIN
 CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."member_role" AS ENUM('super_admin', 'admin', 'member');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_method" AS ENUM('bkash', 'nagad');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected', 'not_found', 'rechecked');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE "members" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone_no" varchar(30),
	"img" text,
	"user_status" "member_status" DEFAULT 'active' NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"joining_date" date DEFAULT now() NOT NULL,
	"starting_month" date NOT NULL,
	"whatsapp_number" varchar(30),
	"address" text,
	"location" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_amount" integer DEFAULT 10000 NOT NULL,
	"monthly_fine" integer DEFAULT 300 NOT NULL,
	"payment_deadline_day" integer DEFAULT 10 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_settings_monthly_amount_positive" CHECK ("payment_settings"."monthly_amount" > 0),
	CONSTRAINT "payment_settings_monthly_fine_non_negative" CHECK ("payment_settings"."monthly_fine" >= 0),
	CONSTRAINT "payment_settings_deadline_day_valid" CHECK ("payment_settings"."payment_deadline_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"payment_month" date NOT NULL,
	"amount" integer DEFAULT 10000 NOT NULL,
	"fine_months" integer DEFAULT 0 NOT NULL,
	"extra_fine" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"transaction_no" varchar(100),
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_fine_months_non_negative" CHECK ("payments"."fine_months" >= 0),
	CONSTRAINT "payments_extra_fine_non_negative" CHECK ("payments"."extra_fine" >= 0),
	CONSTRAINT "payments_total_non_negative" CHECK ("payments"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_members_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_user_month_unique" ON "payments" USING btree ("user_id","payment_month");
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_transaction_no_unique" ON "payments" USING btree ("transaction_no");
--> statement-breakpoint
DROP TABLE IF EXISTS "demo_users";
