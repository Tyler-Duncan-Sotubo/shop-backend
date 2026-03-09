CREATE TABLE "quote_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "quote_number" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "quote_counters_company_unique" ON "quote_counters" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_requests_company_quote_number_unique" ON "quote_requests" USING btree ("company_id","quote_number");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "zoho_estimate_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "zoho_estimate_number";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "zoho_estimate_status";