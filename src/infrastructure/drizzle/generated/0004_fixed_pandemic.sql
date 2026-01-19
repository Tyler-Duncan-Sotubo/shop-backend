DROP INDEX "categories_company_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_company_store_slug_uq" ON "categories" USING btree ("company_id","store_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_company_slug_default_uq" ON "categories" USING btree ("company_id","slug") WHERE "categories"."store_id" IS NULL;