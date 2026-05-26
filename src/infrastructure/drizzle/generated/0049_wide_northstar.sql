CREATE TABLE "order_dispatches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"requested_by_user_id" uuid,
	"confirmed_by_user_id" uuid,
	"note" text,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_dispatches_company_idx" ON "order_dispatches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "order_dispatches_order_idx" ON "order_dispatches" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE INDEX "order_dispatches_status_idx" ON "order_dispatches" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "order_dispatches_store_status_idx" ON "order_dispatches" USING btree ("company_id","store_id","status");