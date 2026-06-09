CREATE TABLE "user_store_access" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_store_access" ADD CONSTRAINT "user_store_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_store_access" ADD CONSTRAINT "user_store_access_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_store_access" ADD CONSTRAINT "user_store_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_store_access" ON "user_store_access" USING btree ("user_id","store_id");--> statement-breakpoint
CREATE INDEX "idx_user_store_access_user_id" ON "user_store_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_store_access_store_id" ON "user_store_access" USING btree ("store_id");