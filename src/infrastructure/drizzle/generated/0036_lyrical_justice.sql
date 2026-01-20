ALTER TABLE "company_roles" ALTER COLUMN "name" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "company_roles" ADD COLUMN "display_name" varchar(128);