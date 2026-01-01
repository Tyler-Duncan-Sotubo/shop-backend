CREATE TABLE "payment_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid,
	"order_id" uuid,
	"invoice_number" text,
	"order_number" text,
	"sequence_number" integer NOT NULL,
	"receipt_number" text NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"customer_snapshot" jsonb,
	"store_snapshot" jsonb,
	"meta" jsonb,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_counters" ADD CONSTRAINT "receipt_counters_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_company_payment_uq" ON "payment_receipts" USING btree ("company_id","payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_company_receipt_number_uq" ON "payment_receipts" USING btree ("company_id","receipt_number");--> statement-breakpoint
CREATE INDEX "payment_receipts_company_invoice_idx" ON "payment_receipts" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE INDEX "payment_receipts_company_order_idx" ON "payment_receipts" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_counters_company_uq" ON "receipt_counters" USING btree ("company_id");