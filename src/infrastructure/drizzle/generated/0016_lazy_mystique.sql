ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_company_store_created_idx" ON "orders" USING btree ("company_id","store_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_company_status_created_idx" ON "orders" USING btree ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "order_items_company_product_idx" ON "order_items" USING btree ("company_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_company_variant_idx" ON "order_items" USING btree ("company_id","variant_id");