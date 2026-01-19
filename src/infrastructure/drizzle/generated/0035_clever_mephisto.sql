ALTER TABLE "checkouts" ADD COLUMN "payment_method_type" varchar(32);--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "payment_provider" varchar(32);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method_type" varchar(32);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_provider" varchar(32);