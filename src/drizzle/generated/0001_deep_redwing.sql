DROP INDEX "invoice_lines_invoice_position_uq";--> statement-breakpoint
DROP INDEX "pay_alloc_payment_invoice_uq";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_total_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_total_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_total_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_price_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_total_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_series" ADD COLUMN "type" "invoice_type" DEFAULT 'invoice' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_company_created_idx" ON "orders" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_company_order_idx" ON "order_items" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_order_type_uq" ON "invoices" USING btree ("company_id","order_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_lines_company_invoice_position_uq" ON "invoice_lines" USING btree ("company_id","invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_taxes_line_tax_uq" ON "invoice_line_taxes" USING btree ("company_id","line_id","tax_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_company_provider_ref_uq" ON "payments" USING btree ("company_id","provider","provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_company_provider_event_uq" ON "payments" USING btree ("company_id","provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pay_alloc_company_payment_invoice_uq" ON "payment_allocations" USING btree ("company_id","payment_id","invoice_id");