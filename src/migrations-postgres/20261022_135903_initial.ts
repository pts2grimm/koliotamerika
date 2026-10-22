import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_catalog_events_kind" AS ENUM('search', 'view');
  CREATE TYPE "payload"."enum_catalog_events_section" AS ENUM('cars', 'powersports');
  CREATE TYPE "payload"."enum_catalog_events_outcome" AS ENUM('results', 'empty', 'error');
  CREATE TYPE "payload"."enum_consent_events_action" AS ENUM('accept_all', 'necessary_only', 'save_preferences');
  CREATE TYPE "payload"."enum_saved_vehicles_kind" AS ENUM('auction', 'car');
  CREATE TYPE "payload"."enum_cars_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_cars_fuel" AS ENUM('Бензин', 'Дизел', 'Хибрид', 'Електрически');
  CREATE TYPE "payload"."enum_cars_transmission" AS ENUM('Автоматична', 'Ръчна');
  CREATE TYPE "payload"."enum_cars_availability" AS ENUM('order', 'available', 'sold');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_pages_kind" AS ENUM('page', 'article');
  CREATE TYPE "payload"."enum_inquiries_status" AS ENUM('new', 'progress', 'done');
  CREATE TYPE "payload"."enum_auction_quotes_provider" AS ENUM('apicar');
  CREATE TYPE "payload"."enum_auction_quotes_site" AS ENUM('1', '2');
  CREATE TYPE "payload"."enum_integrations_installation" AS ENUM('direct', 'gtm');
  CREATE TABLE "payload"."catalog_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event" varchar NOT NULL,
  	"subject" varchar,
  	"customer_id" integer,
  	"kind" "payload"."enum_catalog_events_kind" NOT NULL,
  	"section" "payload"."enum_catalog_events_section" NOT NULL,
  	"archive" boolean,
  	"make" varchar,
  	"model" varchar,
  	"year_from" varchar,
  	"year_to" varchar,
  	"lot" varchar,
  	"site" varchar,
  	"vin" varchar,
  	"query" varchar,
  	"result_count" numeric,
  	"outcome" "payload"."enum_catalog_events_outcome",
  	"filters" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."invoices_vehicles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"vin" varchar NOT NULL,
  	"make" varchar NOT NULL,
  	"model" varchar NOT NULL,
  	"lot" varchar NOT NULL,
  	"year" numeric,
  	"delivery" numeric DEFAULT 0 NOT NULL,
  	"shipping" numeric DEFAULT 0 NOT NULL,
  	"dealer_fee" numeric DEFAULT 0 NOT NULL,
  	"storage" numeric DEFAULT 0 NOT NULL,
  	"late_fee" numeric DEFAULT 0 NOT NULL,
  	"ev_fee" numeric DEFAULT 0 NOT NULL,
  	"add_services" numeric DEFAULT 0 NOT NULL,
  	"total" numeric
  );
  
  CREATE TABLE "payload"."invoices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"invoice_number" varchar NOT NULL,
  	"invoice_date" varchar NOT NULL,
  	"due_date" varchar,
  	"party_snapshot" jsonb NOT NULL,
  	"paid_amount" numeric DEFAULT 0 NOT NULL,
  	"total" numeric,
  	"balance" numeric,
  	"shipper" varchar,
  	"origin" varchar,
  	"consignee" varchar,
  	"destination" varchar,
  	"carrier_name" varchar,
  	"booking_number" varchar,
  	"shipping_date" varchar,
  	"container_number" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."bills_of_sale" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stock" varchar NOT NULL,
  	"sale_date" varchar NOT NULL,
  	"buyer_name" varchar NOT NULL,
  	"buyer_address" varchar NOT NULL,
  	"buyer_city" varchar NOT NULL,
  	"buyer_postal_code" varchar NOT NULL,
  	"buyer_country" varchar NOT NULL,
  	"buyer_phone" varchar,
  	"buyer_home_phone" varchar,
  	"buyer_work_phone" varchar,
  	"buyer_state" varchar,
  	"buyer_county" varchar,
  	"buyer_license" varchar,
  	"buyer_d_o_b" varchar,
  	"buyer_license_expiry" varchar,
  	"vin" varchar NOT NULL,
  	"make" varchar NOT NULL,
  	"model" varchar NOT NULL,
  	"year" numeric NOT NULL,
  	"body" varchar NOT NULL,
  	"cylinders" varchar NOT NULL,
  	"color1" varchar,
  	"color2" varchar,
  	"style" varchar,
  	"transmission" varchar,
  	"mileage" numeric,
  	"vehicle_price" numeric NOT NULL,
  	"shipping" numeric DEFAULT 0 NOT NULL,
  	"paid_amount" numeric DEFAULT 0 NOT NULL,
  	"total" numeric,
  	"balance" numeric,
  	"remarks" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."consent_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"event" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"analytics" boolean DEFAULT false NOT NULL,
  	"marketing" boolean DEFAULT false NOT NULL,
  	"action" "payload"."enum_consent_events_action" NOT NULL,
  	"policy_version" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"consented_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."saved_vehicles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"key" varchar NOT NULL,
  	"kind" "payload"."enum_saved_vehicles_kind" NOT NULL,
  	"title" varchar NOT NULL,
  	"lot" varchar,
  	"site" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "payload"."cars_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."cars_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."cars" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "payload"."enum_cars_status" DEFAULT 'draft' NOT NULL,
  	"make" varchar NOT NULL,
  	"model" varchar NOT NULL,
  	"year" numeric NOT NULL,
  	"price" numeric,
  	"mileage" numeric,
  	"power" numeric,
  	"fuel" "payload"."enum_cars_fuel",
  	"transmission" "payload"."enum_cars_transmission" DEFAULT 'Автоматична',
  	"availability" "payload"."enum_cars_availability" DEFAULT 'order',
  	"image_id" integer,
  	"description" varchar NOT NULL,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"body" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "payload"."enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"kind" "payload"."enum_pages_kind",
  	"eyebrow" varchar,
  	"intro" varchar NOT NULL,
  	"image_id" integer,
  	"body" jsonb,
  	"legacy_image" varchar,
  	"source_u_r_l" varchar,
  	"published_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"car" varchar,
  	"budget" varchar,
  	"message" varchar NOT NULL,
  	"consent" boolean DEFAULT false NOT NULL,
  	"status" "payload"."enum_inquiries_status" DEFAULT 'new',
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."auction_quotes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "payload"."enum_auction_quotes_provider" DEFAULT 'apicar' NOT NULL,
  	"site" "payload"."enum_auction_quotes_site" NOT NULL,
  	"lot" varchar NOT NULL,
  	"key" varchar,
  	"price_e_u_r" numeric NOT NULL,
  	"published" boolean DEFAULT false,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."submission_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"customers_id" integer,
  	"saved_vehicles_id" integer,
  	"media_id" integer,
  	"cars_id" integer,
  	"pages_id" integer,
  	"inquiries_id" integer,
  	"auction_quotes_id" integer,
  	"redirects_id" integer,
  	"submission_limits_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"customers_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."invoice_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"account" varchar NOT NULL,
  	"routing_electronic" varchar NOT NULL,
  	"routing_wire" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."site_settings_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand" varchar DEFAULT 'Коли от Америка' NOT NULL,
  	"phone" varchar,
  	"email" varchar,
  	"us_address" varchar,
  	"google_maps_u_r_l" varchar,
  	"viber_u_r_l" varchar,
  	"facebook_u_r_l" varchar,
  	"working_hours" varchar,
  	"address" varchar,
  	"hero_title" varchar DEFAULT 'Следващата ти кола.
  От другата страна на океана.',
  	"hero_description" varchar DEFAULT 'Открий възможностите за внос на автомобил от САЩ и Канада. От първия избор до пристигането в България — започваме с твоите изисквания.',
  	"hero_image_id" integer,
  	"default_description" varchar DEFAULT 'Автомобили от САЩ и Канада. Разгледайте процеса на внос, изберете автомобил и изпратете запитване до Коли от Америка.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."calculator_settings_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" numeric NOT NULL,
  	"fee" numeric NOT NULL,
  	"percent" numeric NOT NULL,
  	"extra" numeric NOT NULL
  );
  
  CREATE TABLE "payload"."calculator_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"usd_to_eur" numeric DEFAULT 0.9 NOT NULL,
  	"shipping_usd" numeric DEFAULT 1000 NOT NULL,
  	"insurance_usd" numeric DEFAULT 200 NOT NULL,
  	"document_usd" numeric DEFAULT 20 NOT NULL,
  	"port_handling_eur" numeric DEFAULT 300 NOT NULL,
  	"delivery_eur" numeric DEFAULT 1000 NOT NULL,
  	"usd_to_bgn" numeric DEFAULT 1.7 NOT NULL,
  	"fixed_costs" numeric DEFAULT 4100 NOT NULL,
  	"default_inland" numeric DEFAULT 500,
  	"default_shipping" numeric DEFAULT 800,
  	"note" varchar DEFAULT 'Ориентировъчна сметка по тарифата на сайта. Стойностите за транспорт са примерни, а коефициентът за валутата не е курс в реално време. Ремонт, регистрация и всякакви разходи извън договорената оферта се уточняват индивидуално.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."integrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"hostname" varchar DEFAULT 'koliotamerika.bg' NOT NULL,
  	"installation" "payload"."enum_integrations_installation" DEFAULT 'direct' NOT NULL,
  	"ga_enabled" boolean DEFAULT false,
  	"ga_id" varchar,
  	"ads_enabled" boolean DEFAULT false,
  	"ads_id" varchar,
  	"ads_lead_label" varchar,
  	"gtm_id" varchar,
  	"pixel_enabled" boolean DEFAULT false,
  	"pixel_id" varchar,
  	"capi_enabled" boolean DEFAULT false,
  	"meta_access_token" varchar,
  	"meta_test_code" varchar,
  	"clarity_enabled" boolean DEFAULT false,
  	"clarity_id" varchar,
  	"google_verification" varchar,
  	"bing_verification" varchar,
  	"meta_verification" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."catalog_events" ADD CONSTRAINT "catalog_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."invoices_vehicles" ADD CONSTRAINT "invoices_vehicles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."consent_events" ADD CONSTRAINT "consent_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."saved_vehicles" ADD CONSTRAINT "saved_vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cars_gallery" ADD CONSTRAINT "cars_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cars_gallery" ADD CONSTRAINT "cars_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."cars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."cars_features" ADD CONSTRAINT "cars_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."cars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."cars" ADD CONSTRAINT "cars_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cars" ADD CONSTRAINT "cars_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_sections" ADD CONSTRAINT "pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."inquiries" ADD CONSTRAINT "inquiries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_vehicles_fk" FOREIGN KEY ("saved_vehicles_id") REFERENCES "payload"."saved_vehicles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cars_fk" FOREIGN KEY ("cars_id") REFERENCES "payload"."cars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "payload"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_auction_quotes_fk" FOREIGN KEY ("auction_quotes_id") REFERENCES "payload"."auction_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "payload"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submission_limits_fk" FOREIGN KEY ("submission_limits_id") REFERENCES "payload"."submission_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "payload"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_faq" ADD CONSTRAINT "site_settings_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."calculator_settings_tiers" ADD CONSTRAINT "calculator_settings_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."calculator_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "catalog_events_event_idx" ON "payload"."catalog_events" USING btree ("event");
  CREATE INDEX "catalog_events_subject_idx" ON "payload"."catalog_events" USING btree ("subject");
  CREATE INDEX "catalog_events_customer_idx" ON "payload"."catalog_events" USING btree ("customer_id");
  CREATE INDEX "catalog_events_kind_idx" ON "payload"."catalog_events" USING btree ("kind");
  CREATE INDEX "catalog_events_make_idx" ON "payload"."catalog_events" USING btree ("make");
  CREATE INDEX "catalog_events_lot_idx" ON "payload"."catalog_events" USING btree ("lot");
  CREATE INDEX "catalog_events_updated_at_idx" ON "payload"."catalog_events" USING btree ("updated_at");
  CREATE INDEX "catalog_events_created_at_idx" ON "payload"."catalog_events" USING btree ("created_at");
  CREATE INDEX "invoices_vehicles_order_idx" ON "payload"."invoices_vehicles" USING btree ("_order");
  CREATE INDEX "invoices_vehicles_parent_id_idx" ON "payload"."invoices_vehicles" USING btree ("_parent_id");
  CREATE INDEX "invoices_vehicles_vin_idx" ON "payload"."invoices_vehicles" USING btree ("vin");
  CREATE UNIQUE INDEX "invoices_invoice_number_idx" ON "payload"."invoices" USING btree ("invoice_number");
  CREATE INDEX "invoices_updated_at_idx" ON "payload"."invoices" USING btree ("updated_at");
  CREATE INDEX "invoices_created_at_idx" ON "payload"."invoices" USING btree ("created_at");
  CREATE UNIQUE INDEX "bills_of_sale_stock_idx" ON "payload"."bills_of_sale" USING btree ("stock");
  CREATE INDEX "bills_of_sale_vin_idx" ON "payload"."bills_of_sale" USING btree ("vin");
  CREATE INDEX "bills_of_sale_updated_at_idx" ON "payload"."bills_of_sale" USING btree ("updated_at");
  CREATE INDEX "bills_of_sale_created_at_idx" ON "payload"."bills_of_sale" USING btree ("created_at");
  CREATE INDEX "consent_events_customer_idx" ON "payload"."consent_events" USING btree ("customer_id");
  CREATE UNIQUE INDEX "consent_events_event_idx" ON "payload"."consent_events" USING btree ("event");
  CREATE INDEX "consent_events_subject_idx" ON "payload"."consent_events" USING btree ("subject");
  CREATE INDEX "consent_events_updated_at_idx" ON "payload"."consent_events" USING btree ("updated_at");
  CREATE INDEX "consent_events_created_at_idx" ON "payload"."consent_events" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "customers_sessions_order_idx" ON "payload"."customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "payload"."customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "payload"."customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "payload"."customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "payload"."customers" USING btree ("email");
  CREATE INDEX "saved_vehicles_customer_idx" ON "payload"."saved_vehicles" USING btree ("customer_id");
  CREATE UNIQUE INDEX "saved_vehicles_key_idx" ON "payload"."saved_vehicles" USING btree ("key");
  CREATE INDEX "saved_vehicles_updated_at_idx" ON "payload"."saved_vehicles" USING btree ("updated_at");
  CREATE INDEX "saved_vehicles_created_at_idx" ON "payload"."saved_vehicles" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "cars_gallery_order_idx" ON "payload"."cars_gallery" USING btree ("_order");
  CREATE INDEX "cars_gallery_parent_id_idx" ON "payload"."cars_gallery" USING btree ("_parent_id");
  CREATE INDEX "cars_gallery_image_idx" ON "payload"."cars_gallery" USING btree ("image_id");
  CREATE INDEX "cars_features_order_idx" ON "payload"."cars_features" USING btree ("_order");
  CREATE INDEX "cars_features_parent_id_idx" ON "payload"."cars_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "cars_slug_idx" ON "payload"."cars" USING btree ("slug");
  CREATE INDEX "cars_make_idx" ON "payload"."cars" USING btree ("make");
  CREATE INDEX "cars_image_idx" ON "payload"."cars" USING btree ("image_id");
  CREATE INDEX "cars_seo_seo_image_idx" ON "payload"."cars" USING btree ("seo_image_id");
  CREATE INDEX "cars_updated_at_idx" ON "payload"."cars" USING btree ("updated_at");
  CREATE INDEX "cars_created_at_idx" ON "payload"."cars" USING btree ("created_at");
  CREATE INDEX "pages_sections_order_idx" ON "payload"."pages_sections" USING btree ("_order");
  CREATE INDEX "pages_sections_parent_id_idx" ON "payload"."pages_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_image_idx" ON "payload"."pages" USING btree ("image_id");
  CREATE INDEX "pages_seo_seo_image_idx" ON "payload"."pages" USING btree ("seo_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "inquiries_customer_idx" ON "payload"."inquiries" USING btree ("customer_id");
  CREATE INDEX "inquiries_updated_at_idx" ON "payload"."inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "payload"."inquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "auction_quotes_key_idx" ON "payload"."auction_quotes" USING btree ("key");
  CREATE INDEX "auction_quotes_updated_at_idx" ON "payload"."auction_quotes" USING btree ("updated_at");
  CREATE INDEX "auction_quotes_created_at_idx" ON "payload"."auction_quotes" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "payload"."redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "payload"."redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "payload"."redirects" USING btree ("created_at");
  CREATE INDEX "submission_limits_key_idx" ON "payload"."submission_limits" USING btree ("key");
  CREATE INDEX "submission_limits_updated_at_idx" ON "payload"."submission_limits" USING btree ("updated_at");
  CREATE INDEX "submission_limits_created_at_idx" ON "payload"."submission_limits" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_saved_vehicles_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("saved_vehicles_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_cars_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("cars_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_auction_quotes_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("auction_quotes_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_submission_limits_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("submission_limits_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload"."payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_faq_order_idx" ON "payload"."site_settings_faq" USING btree ("_order");
  CREATE INDEX "site_settings_faq_parent_id_idx" ON "payload"."site_settings_faq" USING btree ("_parent_id");
  CREATE INDEX "site_settings_hero_image_idx" ON "payload"."site_settings" USING btree ("hero_image_id");
  CREATE INDEX "calculator_settings_tiers_order_idx" ON "payload"."calculator_settings_tiers" USING btree ("_order");
  CREATE INDEX "calculator_settings_tiers_parent_id_idx" ON "payload"."calculator_settings_tiers" USING btree ("_parent_id");`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Database rollback must preserve all business records; use the retained source database.')
}
