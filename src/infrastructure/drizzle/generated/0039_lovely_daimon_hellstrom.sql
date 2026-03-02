ALTER TABLE "quote_request_items" ADD COLUMN "unit_price_minor" integer;--> statement-breakpoint
ALTER TABLE "quote_request_items" ADD COLUMN "discount_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "quote_request_items" ADD COLUMN "line_note" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_organization_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_contact_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_number" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_estimate_status" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_sales_order_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "zoho_invoice_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "created_zoho_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "converted_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "currency" text DEFAULT 'GBP';--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "totals_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "sync_error" text;