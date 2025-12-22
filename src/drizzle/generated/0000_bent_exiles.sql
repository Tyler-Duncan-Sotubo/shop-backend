
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text,
	"country" text,
	"vat_number" text,
	"default_currency" text DEFAULT 'NGN' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"default_locale" text DEFAULT 'en-NG' NOT NULL,
	"billing_email" text,
	"billing_customer_id" text,
	"billing_provider" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"trial_ends_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"user_agent" varchar(500),
	"ip_address" varchar(100),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"avatar" varchar(500),
	"company_id" uuid NOT NULL,
	"company_role_id" uuid NOT NULL,
	"verification_code" varchar(6),
	"verification_code_expires_at" timestamp,
	"allow_marketing_emails" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" "company_role_enum" NOT NULL,
	"description" varchar(255),
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(150) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"prefix" varchar(64) NOT NULL,
	"scopes" text[],
	"allowed_origins" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"details" text,
	"changes" jsonb,
	"ip_address" varchar(45),
	"correlation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"type" "customer_type" DEFAULT 'individual' NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"company_name" varchar(255),
	"billing_email" varchar(255),
	"phone" varchar(50),
	"tax_id" varchar(100),
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" varchar(100),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"line1" varchar(255) NOT NULL,
	"line2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100),
	"postal_code" varchar(50),
	"country" varchar(100) NOT NULL,
	"phone" varchar(50),
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"invite_token_hash" varchar(255),
	"invite_expires_at" timestamp with time zone,
	"invite_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "store_domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "store_locations" (
	"store_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_locations_pk" PRIMARY KEY("store_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" text DEFAULT 'warehouse' NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"available" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"delta_available" integer DEFAULT 0 NOT NULL,
	"delta_reserved" integer DEFAULT 0 NOT NULL,
	"type" text NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"actor_user_id" uuid,
	"ip_address" text,
	"note" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"is_gift_card" boolean DEFAULT false NOT NULL,
	"product_type" "product_type" DEFAULT 'simple' NOT NULL,
	"default_variant_id" uuid,
	"default_image_id" uuid,
	"seo_title" varchar(255),
	"seo_description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"var_id" integer GENERATED ALWAYS AS IDENTITY (sequence name "product_variants_var_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"image_id" uuid,
	"sku" varchar(64),
	"barcode" varchar(64),
	"title" text,
	"option1" varchar(255),
	"option2" varchar(255),
	"option3" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"regular_price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2),
	"sale_start_at" timestamp,
	"sale_end_at" timestamp,
	"currency" varchar(10) DEFAULT 'NGN' NOT NULL,
	"weight" numeric(10, 3),
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_option_id" uuid NOT NULL,
	"value" varchar(255) NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"linked_product_id" uuid NOT NULL,
	"link_type" "product_link_type" DEFAULT 'related' NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"rating" integer NOT NULL,
	"review" text NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"approved_at" timestamp with time zone,
	"moderated_by_user_id" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zone_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"country_code" varchar(2) DEFAULT 'NG' NOT NULL,
	"region_code" varchar(64),
	"area" text,
	"postal_code_pattern" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"provider_key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"company_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"type" "shipping_rate_type" DEFAULT 'flat' NOT NULL,
	"flat_amount" numeric(12, 2),
	"min_order_subtotal" numeric(12, 2),
	"max_order_subtotal" numeric(12, 2),
	"min_weight_grams" integer,
	"max_weight_grams" integer,
	"carrier_id" uuid,
	"carrier_service_code" varchar(64),
	"carrier_service_name" text,
	"min_delivery_days" integer,
	"max_delivery_days" integer,
	"priority" integer DEFAULT 0 NOT NULL,
	"calc" "shipping_rate_calc" DEFAULT 'flat' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rate_tiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"rate_id" uuid NOT NULL,
	"min_weight_grams" integer,
	"max_weight_grams" integer,
	"min_subtotal" numeric(12, 2),
	"max_subtotal" numeric(12, 2),
	"amount" numeric(12, 2) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" integer GENERATED ALWAYS AS IDENTITY (sequence name "carts_cart_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" uuid NOT NULL,
	"owner_type" "cart_owner_type" DEFAULT 'guest' NOT NULL,
	"customer_id" uuid,
	"guest_token" varchar(255),
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totals_breakdown" jsonb,
	"selected_shipping_rate_id" uuid,
	"selected_shipping_method_label" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"origin_inventory_location_id" uuid,
	"channel" "cart_channel" DEFAULT 'online' NOT NULL,
	"fulfillment_mode" text DEFAULT 'single_location' NOT NULL,
	"fulfillment_breakdown" jsonb,
	"metadata" jsonb,
	"converted_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"sku" varchar(64),
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"attributes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"channel" varchar(16) DEFAULT 'online' NOT NULL,
	"currency" varchar(8) DEFAULT 'NGN' NOT NULL,
	"email" varchar(255),
	"delivery_method_type" varchar(16) DEFAULT 'shipping' NOT NULL,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"pickup_location_id" uuid,
	"origin_inventory_location_id" uuid,
	"shipping_zone_id" uuid,
	"selected_shipping_rate_id" uuid,
	"shipping_method_label" text,
	"shipping_quote" jsonb,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"checkout_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"sku" varchar(64),
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"attributes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_location_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"state" varchar(100) NOT NULL,
	"address" jsonb NOT NULL,
	"instructions" text,
	"lead_time_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_number" varchar(32) NOT NULL,
	"company_id" uuid NOT NULL,
	"checkout_id" uuid,
	"cart_id" uuid,
	"status" varchar(32) NOT NULL,
	"channel" varchar(16) NOT NULL,
	"currency" varchar(8) NOT NULL,
	"customer_id" uuid,
	"delivery_method_type" varchar(16) DEFAULT 'shipping' NOT NULL,
	"pickup_location_id" uuid,
	"shipping_zone_id" uuid,
	"selected_shipping_rate_id" uuid,
	"shipping_method_label" text,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"origin_inventory_location_id" uuid,
	"shipping_quote" jsonb,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_total" numeric(12, 2) NOT NULL,
	"tax_total" numeric(12, 2) NOT NULL,
	"shipping_total" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"sku" varchar(64),
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" varchar(16) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_user_id" uuid,
	"ip_address" text,
	"message" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_series" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"suffix" text,
	"padding" integer DEFAULT 6 NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"order_id" uuid,
	"type" "invoice_type" DEFAULT 'invoice' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"customer_id" uuid,
	"billing_address_id" uuid,
	"shipping_address_id" uuid,
	"customer_snapshot" jsonb,
	"supplier_snapshot" jsonb,
	"series_id" uuid,
	"sequence_number" integer,
	"number" text,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"currency" text NOT NULL,
	"exchange_rate" numeric(18, 8),
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"shipping_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"adjustment_minor" bigint DEFAULT 0 NOT NULL,
	"rounding_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"paid_minor" bigint DEFAULT 0 NOT NULL,
	"balance_minor" bigint DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"order_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"line_net_minor" bigint DEFAULT 0 NOT NULL,
	"tax_id" uuid,
	"tax_name" text,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"tax_inclusive" boolean DEFAULT false NOT NULL,
	"tax_exempt" boolean DEFAULT false NOT NULL,
	"tax_exempt_reason" text,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint DEFAULT 0 NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "invoice_line_taxes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_id" uuid NOT NULL,
	"tax_id" uuid,
	"name" text NOT NULL,
	"rate_bps" integer DEFAULT 0 NOT NULL,
	"inclusive" boolean DEFAULT false NOT NULL,
	"taxable_base_minor" bigint DEFAULT 0 NOT NULL,
	"amount_minor" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"template_id" uuid,
	"kind" text DEFAULT 'pdf' NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"superseded_by_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_branding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"store_id" uuid,
	"template_id" uuid,
	"logo_url" text,
	"primary_color" text,
	"supplier_name" text,
	"supplier_address" text,
	"supplier_email" text,
	"supplier_phone" text,
	"supplier_tax_id" text,
	"bank_details" jsonb,
	"footer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"version" text DEFAULT 'v1' NOT NULL,
	"name" text NOT NULL,
	"engine" text DEFAULT 'handlebars' NOT NULL,
	"content" text NOT NULL,
	"css" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid,
	"invoice_id" uuid,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reference" text,
	"provider" text,
	"provider_event_id" text,
	"received_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"confirmed_by_user_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"status" "allocation_status" DEFAULT 'applied' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"rate_bps" integer NOT NULL,
	"is_inclusive" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_role_id_company_roles_id_fk" FOREIGN KEY ("company_role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_company_role_id_company_roles_id_fk" FOREIGN KEY ("company_role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_domains" ADD CONSTRAINT "store_domains_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_locations" ADD CONSTRAINT "store_locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_locations" ADD CONSTRAINT "store_locations_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_location_id_inventory_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_location_id_inventory_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_transfer_id_inventory_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inventory_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_default_image_id_product_images_id_fk" FOREIGN KEY ("default_image_id") REFERENCES "public"."product_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_image_id_product_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."product_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_option_id_product_options_id_fk" FOREIGN KEY ("product_option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_linked_product_id_products_id_fk" FOREIGN KEY ("linked_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zone_locations" ADD CONSTRAINT "shipping_zone_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zone_locations" ADD CONSTRAINT "shipping_zone_locations_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rate_tiers" ADD CONSTRAINT "shipping_rate_tiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rate_tiers" ADD CONSTRAINT "shipping_rate_tiers_rate_id_shipping_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."shipping_rates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_selected_shipping_rate_id_shipping_rates_id_fk" FOREIGN KEY ("selected_shipping_rate_id") REFERENCES "public"."shipping_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_origin_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("origin_inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_pickup_location_id_pickup_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_origin_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("origin_inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_selected_shipping_rate_id_shipping_rates_id_fk" FOREIGN KEY ("selected_shipping_rate_id") REFERENCES "public"."shipping_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_pickup_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_selected_shipping_rate_id_shipping_rates_id_fk" FOREIGN KEY ("selected_shipping_rate_id") REFERENCES "public"."shipping_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_origin_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("origin_inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_address_id_customer_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipping_address_id_customer_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_series_id_invoice_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."invoice_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tax_id_taxes_id_fk" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_line_id_invoice_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_tax_id_taxes_id_fk" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_template_id_invoice_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."invoice_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_superseded_by_id_invoice_documents_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."invoice_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_branding" ADD CONSTRAINT "invoice_branding_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_branding" ADD CONSTRAINT "invoice_branding_template_id_invoice_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."invoice_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_companies_country" ON "companies" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_companies_plan" ON "companies" USING btree ("plan");--> statement-breakpoint
CREATE UNIQUE INDEX "company_settings_company_key_uq" ON "company_settings" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "idx_company_settings_company_id" ON "company_settings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_settings_key" ON "company_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_user_id" ON "verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_verification_tokens_token" ON "verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_company_id" ON "sessions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_is_revoked" ON "sessions" USING btree ("is_revoked");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_company_id" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_users_company_role_id" ON "users" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX "idx_company_roles_company_id" ON "company_roles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_roles_company_name" ON "company_roles" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "idx_crp_role_id" ON "company_role_permissions" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX "idx_crp_permission_id" ON "company_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_company_role_permission" ON "company_role_permissions" USING btree ("company_role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_permissions_created_at" ON "permissions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_api_keys_prefix" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "idx_api_keys_company_id" ON "api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_is_active" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "customers_company_idx" ON "customers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "customers_company_active_idx" ON "customers" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "customers_company_display_name_idx" ON "customers" USING btree ("company_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_company_billing_email" ON "customers" USING btree ("company_id","billing_email");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_company_id" ON "customer_addresses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_credentials_company_idx" ON "customer_credentials" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "customer_credentials_customer_idx" ON "customer_credentials" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_credentials_company_email_uq" ON "customer_credentials" USING btree ("company_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_credentials_customer_uq" ON "customer_credentials" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_company_slug_unique" ON "stores" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "idx_stores_company_id" ON "stores" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_stores_is_active" ON "stores" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "store_domains_domain_unique" ON "store_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_store_domains_store_id" ON "store_domains" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_locations_store_id" ON "store_locations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_locations_location_id" ON "store_locations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfers_company_id" ON "inventory_transfers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfers_from_location_id" ON "inventory_transfers" USING btree ("from_location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfers_to_location_id" ON "inventory_transfers" USING btree ("to_location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfers_status" ON "inventory_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfer_items_transfer_id" ON "inventory_transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transfer_items_variant_id" ON "inventory_transfer_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_locations_company_id" ON "inventory_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_locations_type" ON "inventory_locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_inventory_locations_is_active" ON "inventory_locations" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_company_code_unique" ON "inventory_locations" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_company_id" ON "inventory_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_location_id" ON "inventory_items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_variant_id" ON "inventory_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_variant_location_unique" ON "inventory_items" USING btree ("company_id","product_variant_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_company_idx" ON "inventory_movements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_location_idx" ON "inventory_movements" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_variant_idx" ON "inventory_movements" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_ref_idx" ON "inventory_movements" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_created_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_company_slug_unique" ON "products" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "idx_products_company_id" ON "products" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_products_company_status" ON "products" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_company_sku_unique" ON "product_variants" USING btree ("company_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_option_value_unique" ON "product_option_values" USING btree ("product_option_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_product_name_unique" ON "product_options" USING btree ("product_id","name");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_position" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_images_variant" ON "product_images" USING btree ("company_id","product_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_company_slug_unique" ON "categories" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "idx_categories_company_parent" ON "categories" USING btree ("company_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_pk" ON "product_categories" USING btree ("product_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_category_id" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_categories_company_id" ON "product_categories" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_links_unique" ON "product_links" USING btree ("company_id","product_id","linked_product_id","link_type");--> statement-breakpoint
CREATE INDEX "product_reviews_company_idx" ON "product_reviews" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_reviews_created_idx" ON "product_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_reviews_approved_idx" ON "product_reviews" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "shipping_zones_company_idx" ON "shipping_zones" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "shipping_zones_company_active_idx" ON "shipping_zones" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "shipping_zones_company_priority_idx" ON "shipping_zones" USING btree ("company_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zones_company_name_uniq" ON "shipping_zones" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "zone_locations_company_idx" ON "shipping_zone_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "zone_locations_zone_idx" ON "shipping_zone_locations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "zone_locations_country_idx" ON "shipping_zone_locations" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "zone_locations_region_idx" ON "shipping_zone_locations" USING btree ("region_code");--> statement-breakpoint
CREATE UNIQUE INDEX "zone_locations_unique" ON "shipping_zone_locations" USING btree ("zone_id","country_code","region_code","area","postal_code_pattern");--> statement-breakpoint
CREATE INDEX "carriers_company_idx" ON "carriers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "carriers_company_active_idx" ON "carriers" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "carriers_company_provider_idx" ON "carriers" USING btree ("company_id","provider_key");--> statement-breakpoint
CREATE UNIQUE INDEX "carriers_company_provider_uniq" ON "carriers" USING btree ("company_id","provider_key");--> statement-breakpoint
CREATE INDEX "shipping_rates_company_idx" ON "shipping_rates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "shipping_rates_zone_idx" ON "shipping_rates" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "shipping_rates_company_active_idx" ON "shipping_rates" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE INDEX "shipping_rates_type_idx" ON "shipping_rates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "shipping_rates_priority_idx" ON "shipping_rates" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "shipping_rates_carrier_idx" ON "shipping_rates" USING btree ("carrier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_rates_zone_name_uniq" ON "shipping_rates" USING btree ("zone_id","name");--> statement-breakpoint
CREATE INDEX "shipping_rate_tiers_company_idx" ON "shipping_rate_tiers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "shipping_rate_tiers_rate_idx" ON "shipping_rate_tiers" USING btree ("rate_id");--> statement-breakpoint
CREATE INDEX "shipping_rate_tiers_priority_idx" ON "shipping_rate_tiers" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "carts_company_idx" ON "carts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "carts_company_status_idx" ON "carts" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "carts_expires_idx" ON "carts" USING btree ("company_id","expires_at");--> statement-breakpoint
CREATE INDEX "carts_customer_idx" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_guest_token_uniq" ON "carts" USING btree ("company_id","guest_token");--> statement-breakpoint
CREATE INDEX "carts_origin_location_idx" ON "carts" USING btree ("company_id","origin_inventory_location_id");--> statement-breakpoint
CREATE INDEX "carts_selected_shipping_rate_idx" ON "carts" USING btree ("company_id","selected_shipping_rate_id");--> statement-breakpoint
CREATE INDEX "carts_fulfillment_mode_idx" ON "carts" USING btree ("company_id","fulfillment_mode");--> statement-breakpoint
CREATE INDEX "carts_converted_order_idx" ON "carts" USING btree ("company_id","converted_order_id");--> statement-breakpoint
CREATE INDEX "cart_items_company_idx" ON "cart_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cart_items_variant_idx" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_uniq" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_no_variant_uniq" ON "cart_items" USING btree ("cart_id","product_id") WHERE "cart_items"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "checkouts_company_cart_unique" ON "checkouts" USING btree ("company_id","cart_id");--> statement-breakpoint
CREATE INDEX "checkouts_company_status_idx" ON "checkouts" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "checkouts_company_channel_idx" ON "checkouts" USING btree ("company_id","channel");--> statement-breakpoint
CREATE INDEX "checkouts_company_pickup_idx" ON "checkouts" USING btree ("company_id","pickup_location_id");--> statement-breakpoint
CREATE INDEX "checkouts_company_selected_rate_idx" ON "checkouts" USING btree ("company_id","selected_shipping_rate_id");--> statement-breakpoint
CREATE INDEX "checkout_items_company_checkout_idx" ON "checkout_items" USING btree ("company_id","checkout_id");--> statement-breakpoint
CREATE INDEX "pickup_locations_company_idx" ON "pickup_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pickup_locations_active_idx" ON "pickup_locations" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "pickup_locations_company_name_unique" ON "pickup_locations" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "order_counters_company_unique" ON "order_counters" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_unique" ON "orders" USING btree ("company_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_company_cart_unique" ON "orders" USING btree ("company_id","cart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_company_checkout_unique" ON "orders" USING btree ("company_id","checkout_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "orders_delivery_idx" ON "orders" USING btree ("company_id","delivery_method_type");--> statement-breakpoint
CREATE INDEX "orders_pickup_idx" ON "orders" USING btree ("company_id","pickup_location_id");--> statement-breakpoint
CREATE INDEX "reservation_order_idx" ON "inventory_reservations" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE INDEX "reservation_variant_idx" ON "inventory_reservations" USING btree ("company_id","location_id","product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_unique" ON "inventory_reservations" USING btree ("company_id","order_id","location_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "order_events_company_order_idx" ON "order_events" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE INDEX "order_events_company_created_idx" ON "order_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_series_company_idx" ON "invoice_series" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_series_company_name_uq" ON "invoice_series" USING btree ("company_id","name","store_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_series_company_prefix_uq" ON "invoice_series" USING btree ("company_id","prefix","store_id","year");--> statement-breakpoint
CREATE INDEX "invoices_company_status_idx" ON "invoices" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "invoices_company_customer_idx" ON "invoices" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE INDEX "invoices_company_order_idx" ON "invoices" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE INDEX "invoices_company_issued_idx" ON "invoices" USING btree ("company_id","issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_number_uq" ON "invoices" USING btree ("company_id","number");--> statement-breakpoint
CREATE INDEX "invoices_company_series_seq_idx" ON "invoices" USING btree ("company_id","series_id","sequence_number");--> statement-breakpoint
CREATE INDEX "invoice_lines_company_invoice_idx" ON "invoice_lines" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_company_tax_idx" ON "invoice_lines" USING btree ("company_id","tax_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_company_order_idx" ON "invoice_lines" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_lines_invoice_position_uq" ON "invoice_lines" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoice_line_taxes_invoice_idx" ON "invoice_line_taxes" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_line_taxes_line_idx" ON "invoice_line_taxes" USING btree ("company_id","line_id");--> statement-breakpoint
CREATE INDEX "invoice_line_taxes_tax_idx" ON "invoice_line_taxes" USING btree ("company_id","tax_id");--> statement-breakpoint
CREATE INDEX "invoice_documents_company_invoice_idx" ON "invoice_documents" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_documents_invoice_created_idx" ON "invoice_documents" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_branding_company_store_idx" ON "invoice_branding" USING btree ("company_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_templates_key_version_uq" ON "invoice_templates" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "invoice_templates_active_idx" ON "invoice_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "invoice_templates_default_idx" ON "invoice_templates" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "payments_company_invoice_idx" ON "payments" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE INDEX "payments_company_order_idx" ON "payments" USING btree ("company_id","order_id");--> statement-breakpoint
CREATE INDEX "payments_company_reference_idx" ON "payments" USING btree ("company_id","reference");--> statement-breakpoint
CREATE INDEX "payments_company_provider_event_idx" ON "payments" USING btree ("company_id","provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "pay_alloc_company_payment_idx" ON "payment_allocations" USING btree ("company_id","payment_id");--> statement-breakpoint
CREATE INDEX "pay_alloc_company_invoice_idx" ON "payment_allocations" USING btree ("company_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pay_alloc_payment_invoice_uq" ON "payment_allocations" USING btree ("payment_id","invoice_id");--> statement-breakpoint
CREATE INDEX "taxes_company_idx" ON "taxes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "taxes_company_active_idx" ON "taxes" USING btree ("company_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "taxes_company_name_uq" ON "taxes" USING btree ("company_id","name");