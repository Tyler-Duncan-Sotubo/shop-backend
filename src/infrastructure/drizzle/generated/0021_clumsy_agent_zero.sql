CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"url" text NOT NULL,
	"storage_key" text,
	"size" integer,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"folder" text,
	"tag" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_company" ON "media" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_media_folder" ON "media" USING btree ("company_id","folder");