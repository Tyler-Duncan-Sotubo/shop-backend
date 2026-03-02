ALTER TABLE "orders" ADD COLUMN "zoho_organization_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_contact_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_estimate_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_estimate_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_estimate_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_sales_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_invoice_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zoho_sync_error" text;--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_organization_id";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_contact_id";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_estimate_id";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_estimate_number";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_estimate_status";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_sales_order_id";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "zoho_invoice_id";