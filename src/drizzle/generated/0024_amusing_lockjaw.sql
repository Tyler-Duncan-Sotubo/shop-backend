CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"email" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'subscribed' NOT NULL,
	"source" varchar(64) DEFAULT 'form',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(255),
	"message" text NOT NULL,
	"company" varchar(255),
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_company_email_unique" ON "subscribers" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "subscribers_company_status_idx" ON "subscribers" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "subscribers_company_store_idx" ON "subscribers" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "contact_messages_company_created_idx" ON "contact_messages" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_company_status_idx" ON "contact_messages" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "contact_messages_company_store_idx" ON "contact_messages" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "contact_messages_company_email_idx" ON "contact_messages" USING btree ("company_id","email");