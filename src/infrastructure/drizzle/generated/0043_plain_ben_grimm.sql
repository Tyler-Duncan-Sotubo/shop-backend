ALTER TABLE "quote_requests" ADD COLUMN "zoho_contact_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_organization_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_number" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_status" text;--> statement-breakpoint
CREATE INDEX "idx_quote_requests_zoho_estimate_id" ON "quote_requests" USING btree ("zoho_estimate_id");