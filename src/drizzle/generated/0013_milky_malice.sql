CREATE TABLE "payment_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_provider_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"payment_id" uuid,
	"provider" text NOT NULL,
	"provider_ref" text,
	"provider_event_id" text,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "pay_alloc_company_payment_invoice_uq";--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_files" ADD CONSTRAINT "payment_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_files" ADD CONSTRAINT "payment_files_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_files" ADD CONSTRAINT "payment_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_files_company_payment_idx" ON "payment_files" USING btree ("company_id","payment_id");--> statement-breakpoint
CREATE INDEX "ppe_company_provider_idx" ON "payment_provider_events" USING btree ("company_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "ppe_company_provider_ref_uq" ON "payment_provider_events" USING btree ("company_id","provider","provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "ppe_company_provider_event_uq" ON "payment_provider_events" USING btree ("company_id","provider","provider_event_id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;