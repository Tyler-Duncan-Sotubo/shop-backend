CREATE TABLE "shipping_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"states" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipping_options" ADD CONSTRAINT "shipping_options_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_options" ADD CONSTRAINT "shipping_options_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipping_options_company_idx" ON "shipping_options" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "shipping_options_company_store_idx" ON "shipping_options" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "shipping_options_company_active_idx" ON "shipping_options" USING btree ("company_id","is_active");