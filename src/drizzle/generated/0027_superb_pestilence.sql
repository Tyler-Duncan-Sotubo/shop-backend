CREATE TABLE "analytics_integrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"public_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"private_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"requires_consent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_integrations" ADD CONSTRAINT "analytics_integrations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_integrations" ADD CONSTRAINT "analytics_integrations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_analytics_company_store_provider" ON "analytics_integrations" USING btree ("company_id","store_id","provider");--> statement-breakpoint
CREATE INDEX "idx_analytics_company_store" ON "analytics_integrations" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_company_id" ON "analytics_integrations" USING btree ("company_id");