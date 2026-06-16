CREATE TABLE "order_custom_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"store_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_price_minor" integer DEFAULT 0 NOT NULL,
	"line_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_custom_items" ADD CONSTRAINT "order_custom_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_items" ADD CONSTRAINT "order_custom_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_items" ADD CONSTRAINT "order_custom_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_custom_items_order_idx" ON "order_custom_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_custom_items_company_idx" ON "order_custom_items" USING btree ("company_id");