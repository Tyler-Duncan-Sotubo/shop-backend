CREATE TYPE "public"."storefront_config_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "storefront_bases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ui" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"header" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"footer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storefront_overrides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"base_id" uuid NOT NULL,
	"theme_id" uuid,
	"ui" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"header" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"footer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "storefront_config_status" DEFAULT 'published' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storefront_themes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"store_id" uuid,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "storefront_overrides" ADD CONSTRAINT "storefront_overrides_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_overrides" ADD CONSTRAINT "storefront_overrides_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_overrides" ADD CONSTRAINT "storefront_overrides_base_id_storefront_bases_id_fk" FOREIGN KEY ("base_id") REFERENCES "public"."storefront_bases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_overrides" ADD CONSTRAINT "storefront_overrides_theme_id_storefront_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."storefront_themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD CONSTRAINT "storefront_themes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_themes" ADD CONSTRAINT "storefront_themes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_bases_key" ON "storefront_bases" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_storefront_bases_active" ON "storefront_bases" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_overrides_store_status" ON "storefront_overrides" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_storefront_overrides_company" ON "storefront_overrides" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_overrides_store" ON "storefront_overrides" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_overrides_base" ON "storefront_overrides" USING btree ("base_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_overrides_theme" ON "storefront_overrides" USING btree ("theme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_themes_global_key" ON "storefront_themes" USING btree ("key") WHERE "storefront_themes"."company_id" IS NULL AND "storefront_themes"."store_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_themes_company_key" ON "storefront_themes" USING btree ("company_id","key") WHERE "storefront_themes"."company_id" IS NOT NULL AND "storefront_themes"."store_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_themes_store_key" ON "storefront_themes" USING btree ("store_id","key") WHERE "storefront_themes"."store_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_storefront_themes_company" ON "storefront_themes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_themes_store" ON "storefront_themes" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_themes_active" ON "storefront_themes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_storefront_themes_key" ON "storefront_themes" USING btree ("key");