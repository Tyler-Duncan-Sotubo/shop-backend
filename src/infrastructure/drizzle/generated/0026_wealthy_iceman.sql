ALTER TABLE "categories" ADD COLUMN "after_content_html" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "position" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_company_store_email_unique" ON "subscribers" USING btree ("company_id","store_id","email");