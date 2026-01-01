CREATE TABLE "storefront_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"header" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "storefront_configs" ADD CONSTRAINT "storefront_configs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_storefront_configs_store_id" ON "storefront_configs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_storefront_configs_store_id" ON "storefront_configs" USING btree ("store_id");