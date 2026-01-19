CREATE TABLE "invoice_public_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"token" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
ALTER TABLE "invoice_public_links" ADD CONSTRAINT "invoice_public_links_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_public_links_token_unique" ON "invoice_public_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_public_links_invoice_unique" ON "invoice_public_links" USING btree ("invoice_id");