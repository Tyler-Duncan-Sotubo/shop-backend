ALTER TABLE "carts" ADD COLUMN "guest_refresh_token_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "guest_refresh_token_expires_at" timestamp with time zone;