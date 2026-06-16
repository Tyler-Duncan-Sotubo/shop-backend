CREATE TYPE "public"."campaign_audience_type" AS ENUM('all', 'customers', 'subscribers');--> statement-breakpoint
CREATE TYPE "public"."campaign_event_type" AS ENUM('sent', 'opened', 'clicked', 'unsubscribed', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."campaign_template_type" AS ENUM('new_arrival', 'promotion', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."credit_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('topup', 'send', 'refund', 'adjustment');--> statement-breakpoint
CREATE TABLE "credit_balance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_credits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "credit_balance_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel" "credit_channel" NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"template_type" "campaign_template_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"audience_type" "campaign_audience_type" DEFAULT 'all' NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"content_json" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"unsubscribe_count" integer DEFAULT 0 NOT NULL,
	"resend_batch_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"resend_message_id" varchar(255),
	"event_type" "campaign_event_type" NOT NULL,
	"clicked_url" text
);
--> statement-breakpoint
CREATE TABLE "email_sender_config" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(255) NOT NULL,
	"logo_url" text,
	"brand_color" varchar(7),
	"company_address" text,
	"social_links_json" text,
	"footer_tagline" varchar(255),
	CONSTRAINT "email_sender_config_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
ALTER TABLE "credit_balance" ADD CONSTRAINT "credit_balance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sender_config" ADD CONSTRAINT "email_sender_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_balance_company_idx" ON "credit_balance" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "credit_tx_company_idx" ON "credit_transactions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "credit_tx_channel_idx" ON "credit_transactions" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "credit_tx_type_idx" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_tx_reference_idx" ON "credit_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "campaigns_company_idx" ON "campaigns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "campaigns_store_idx" ON "campaigns" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_scheduled_at_idx" ON "campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_idx" ON "campaign_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_events_company_idx" ON "campaign_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "campaign_events_email_idx" ON "campaign_events" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "campaign_events_resend_msg_idx" ON "campaign_events" USING btree ("resend_message_id");--> statement-breakpoint
CREATE INDEX "campaign_events_type_idx" ON "campaign_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "email_sender_config_company_idx" ON "email_sender_config" USING btree ("company_id");