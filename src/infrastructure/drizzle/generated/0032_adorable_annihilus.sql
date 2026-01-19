CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"method" text NOT NULL,
	"provider" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "store_bank_transfer_details" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text NOT NULL,
	"instructions" text,
	"require_proof" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_provider_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"secret_key_enc" text,
	"public_key_enc" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"provider_account_id" text,
	"connected_at" timestamp,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_files" ADD COLUMN "kind" text DEFAULT 'evidence' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_files" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "pdf_url" text;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "pdf_storage_key" text;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_bank_transfer_details" ADD CONSTRAINT "store_bank_transfer_details_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_connections" ADD CONSTRAINT "payment_provider_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_payment_methods_store_method_unique" ON "payment_methods" USING btree ("store_id","method");--> statement-breakpoint
CREATE INDEX "idx_store_payment_methods_store_id" ON "payment_methods" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_payment_methods_enabled" ON "payment_methods" USING btree ("is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "store_bank_transfer_details_store_unique" ON "store_bank_transfer_details" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_bank_transfer_details_store_id" ON "store_bank_transfer_details" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_provider_connections_store_provider_unique" ON "payment_provider_connections" USING btree ("store_id","provider");--> statement-breakpoint
CREATE INDEX "idx_store_provider_connections_store_id" ON "payment_provider_connections" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;