ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "store_id";