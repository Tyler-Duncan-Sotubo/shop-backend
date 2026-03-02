ALTER TABLE "invoices" ADD COLUMN "zoho_organization_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_contact_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_estimate_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_estimate_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_estimate_status" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_invoice_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_invoice_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_invoice_status" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_sync_error" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "zoho_sent_at" timestamp with time zone;