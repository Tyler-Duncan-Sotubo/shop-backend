DROP INDEX "inventory_locations_company_code_unique";--> statement-breakpoint
DROP INDEX "inventory_items_variant_location_unique";--> statement-breakpoint
DROP INDEX "products_company_slug_unique";--> statement-breakpoint
DROP INDEX "idx_product_variants_product_id";--> statement-breakpoint
DROP INDEX "product_variants_company_sku_unique";--> statement-breakpoint
DROP INDEX "pickup_locations_company_name_unique";--> statement-breakpoint
DROP INDEX "shipping_zones_company_name_uniq";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "checkout_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "cart_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_locations_store_id" ON "inventory_locations" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_store_code_unique" ON "inventory_locations" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_store_id" ON "inventory_items" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_store_variant_location_unique" ON "inventory_items" USING btree ("store_id","product_variant_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_slug_unique" ON "products" USING btree ("company_id","store_id","slug");--> statement-breakpoint
CREATE INDEX "idx_products_store_id" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_variants_company_id" ON "product_variants" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_variants_store_id" ON "product_variants" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_company_sku_unique" ON "product_variants" USING btree ("company_id","sku");--> statement-breakpoint
CREATE INDEX "pickup_locations_store_idx" ON "pickup_locations" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zones_company_name_uniq" ON "shipping_zones" USING btree ("store_id","name");