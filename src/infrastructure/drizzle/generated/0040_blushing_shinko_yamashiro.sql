CREATE TABLE "zoho_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"access_token_expires_at" timestamp,
	"zoho_organization_id" text,
	"zoho_organization_name" text,
	"region" text DEFAULT 'com' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"last_error" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zoho_connections" ADD CONSTRAINT "zoho_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zoho_connections" ADD CONSTRAINT "zoho_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_zoho_connections_company_store" ON "zoho_connections" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_zoho_connections_store" ON "zoho_connections" USING btree ("store_id");