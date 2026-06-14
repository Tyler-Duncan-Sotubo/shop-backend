CREATE TABLE "support_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" varchar(50) DEFAULT 'other' NOT NULL,
	"message" text NOT NULL,
	"platform" varchar(20) DEFAULT 'mobile' NOT NULL
);
