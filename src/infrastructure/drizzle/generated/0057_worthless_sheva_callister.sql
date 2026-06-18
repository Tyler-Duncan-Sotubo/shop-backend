ALTER TABLE "subscribers" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "channel" "credit_channel" DEFAULT 'email' NOT NULL;