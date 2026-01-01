CREATE TABLE "analytics_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "storefront_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"session_id" text NOT NULL,
	"event" text NOT NULL,
	"path" text,
	"referrer" text,
	"title" text,
	"cart_id" uuid,
	"checkout_id" uuid,
	"order_id" uuid,
	"payment_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "storefront_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"session_id" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_path" text,
	"referrer" text,
	"cart_id" uuid,
	"checkout_id" uuid,
	"order_id" uuid,
	"payment_id" uuid,
	"ip_hash" text,
	"ua_hash" text,
	"meta" jsonb
);
--> statement-breakpoint
ALTER TABLE "analytics_tags" ADD CONSTRAINT "analytics_tags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_tags" ADD CONSTRAINT "analytics_tags_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_sessions" ADD CONSTRAINT "storefront_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_sessions" ADD CONSTRAINT "storefront_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_tags_company_token_uq" ON "analytics_tags" USING btree ("company_id","token");--> statement-breakpoint
CREATE INDEX "analytics_tags_company_store_idx" ON "analytics_tags" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE INDEX "analytics_tags_company_active_idx" ON "analytics_tags" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "storefront_events_company_ts_idx" ON "storefront_events" USING btree ("company_id","ts");--> statement-breakpoint
CREATE INDEX "storefront_events_company_event_idx" ON "storefront_events" USING btree ("company_id","event");--> statement-breakpoint
CREATE INDEX "storefront_events_company_session_idx" ON "storefront_events" USING btree ("company_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_sessions_company_session_uq" ON "storefront_sessions" USING btree ("company_id","session_id");--> statement-breakpoint
CREATE INDEX "storefront_sessions_company_last_seen_idx" ON "storefront_sessions" USING btree ("company_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "storefront_sessions_company_store_idx" ON "storefront_sessions" USING btree ("company_id","store_id");