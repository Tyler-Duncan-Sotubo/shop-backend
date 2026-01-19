CREATE TABLE "quote_request_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"name_snapshot" text NOT NULL,
	"variant_snapshot" text,
	"attributes" jsonb,
	"image_url" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"customer_email" text NOT NULL,
	"customer_note" text,
	"meta" jsonb,
	"expires_at" timestamp,
	"archived_at" timestamp,
	"converted_invoice_id" uuid,
	"converted_order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_request_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "quote_request_id" uuid;--> statement-breakpoint
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_items" ADD CONSTRAINT "quote_request_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quote_request_items_quote_position" ON "quote_request_items" USING btree ("quote_request_id","position");--> statement-breakpoint
CREATE INDEX "idx_quote_request_items_product" ON "quote_request_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_quote_request_items_variant" ON "quote_request_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quote_request_items_unique_line" ON "quote_request_items" USING btree ("quote_request_id","product_id","variant_id","name_snapshot");--> statement-breakpoint
CREATE INDEX "idx_quote_requests_company_store" ON "quote_requests" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "idx_quote_requests_store_status" ON "quote_requests" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_quote_requests_store_created" ON "quote_requests" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_quote_requests_expires" ON "quote_requests" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE set null ON UPDATE no action;