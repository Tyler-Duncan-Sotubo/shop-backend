CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."subscription_invoice_status" AS ENUM('paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_invoice_type" AS ENUM('subscription', 'credit_topup');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."topup_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price_ngn" integer DEFAULT 0 NOT NULL,
	"annual_price_ngn" integer DEFAULT 0 NOT NULL,
	"monthly_credits" integer DEFAULT 0 NOT NULL,
	"features" jsonb NOT NULL,
	"paystack_monthly_plan_code" text,
	"paystack_annual_plan_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"paystack_customer_code" text,
	"paystack_subscription_code" text,
	"paystack_email_token" text,
	CONSTRAINT "company_subscriptions_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "credit_topup_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"credits" integer NOT NULL,
	"amount_ngn" integer NOT NULL,
	"status" "topup_status" DEFAULT 'pending' NOT NULL,
	"paystack_reference" text NOT NULL,
	"paystack_access_code" text,
	"paid_at" timestamp with time zone,
	"metadata" jsonb,
	CONSTRAINT "credit_topup_requests_paystack_reference_unique" UNIQUE("paystack_reference")
);
--> statement-breakpoint
CREATE TABLE "subscription_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"subscription_id" uuid,
	"topup_request_id" uuid,
	"type" "subscription_invoice_type" NOT NULL,
	"status" "subscription_invoice_status" NOT NULL,
	"amount_ngn" integer NOT NULL,
	"paystack_reference" text,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_topup_requests" ADD CONSTRAINT "credit_topup_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."company_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_topup_request_id_credit_topup_requests_id_fk" FOREIGN KEY ("topup_request_id") REFERENCES "public"."credit_topup_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_plans_active_idx" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "subscription_plans_sort_idx" ON "subscription_plans" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "company_subscriptions_company_idx" ON "company_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_subscriptions_status_idx" ON "company_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_subscriptions_plan_idx" ON "company_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "company_subscriptions_period_end_idx" ON "company_subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE INDEX "credit_topup_company_idx" ON "credit_topup_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "credit_topup_status_idx" ON "credit_topup_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_topup_reference_idx" ON "credit_topup_requests" USING btree ("paystack_reference");--> statement-breakpoint
CREATE INDEX "subscription_invoices_company_idx" ON "subscription_invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "subscription_invoices_type_idx" ON "subscription_invoices" USING btree ("type");--> statement-breakpoint
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_invoices_sub_idx" ON "subscription_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_invoices_topup_idx" ON "subscription_invoices" USING btree ("topup_request_id");