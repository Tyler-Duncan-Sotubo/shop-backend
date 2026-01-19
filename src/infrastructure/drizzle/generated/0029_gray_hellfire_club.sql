ALTER TABLE "storefront_themes" DROP CONSTRAINT "storefront_themes_store_id_stores_id_fk";
--> statement-breakpoint
DROP INDEX "uq_storefront_themes_store_key";--> statement-breakpoint
DROP INDEX "idx_storefront_themes_store";--> statement-breakpoint
DROP INDEX "uq_storefront_themes_global_key";--> statement-breakpoint
DROP INDEX "uq_storefront_themes_company_key";--> statement-breakpoint
ALTER TABLE "storefront_overrides" ADD COLUMN "theme" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD COLUMN "ui" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD COLUMN "seo" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD COLUMN "header" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD COLUMN "footer" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD COLUMN "pages" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_themes_global_key" ON "storefront_themes" USING btree ("key") WHERE "storefront_themes"."company_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_themes_company_key" ON "storefront_themes" USING btree ("company_id","key") WHERE "storefront_themes"."company_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_themes" DROP COLUMN "store_id";