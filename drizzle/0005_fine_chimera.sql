ALTER TABLE "financial_dashboards" DROP CONSTRAINT "financial_dashboards_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('Cash', 'Bkash', 'Nagad', 'Upay', 'Rocket', 'Bank');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DEFAULT 'Pending'::text;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Approved', 'Rejected', 'Pending', 'recheck');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DEFAULT 'Pending'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DATA TYPE "public"."payment_status" USING "payment_status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "financial_dashboards" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financial_dashboards" ADD CONSTRAINT "financial_dashboards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;