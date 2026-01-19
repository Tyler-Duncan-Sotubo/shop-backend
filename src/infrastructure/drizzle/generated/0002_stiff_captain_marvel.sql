DROP INDEX "taxes_company_active_idx";--> statement-breakpoint
DROP INDEX "taxes_company_name_uq";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "taxes" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "taxes_company_store_idx" ON "taxes" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "taxes_active_idx" ON "taxes" USING btree ("company_id","store_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "taxes_company_store_name_uq" ON "taxes" USING btree ("company_id","store_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "taxes_company_default_uq" ON "taxes" USING btree ("company_id") WHERE "taxes"."store_id" is null;