import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({db}:MigrateUpArgs):Promise<void>{
 await db.run(sql`CREATE TABLE IF NOT EXISTS invoices (
 id integer PRIMARY KEY NOT NULL,
 invoice_number text NOT NULL,
 invoice_date text NOT NULL,
 due_date text,
 party_snapshot text NOT NULL,
 paid_amount numeric NOT NULL DEFAULT 0,
 total numeric,
 balance numeric,
 shipper text,
 origin text,
 consignee text,
 destination text,
 carrier_name text,
 booking_number text,
 shipping_date text,
 container_number text,
 notes text,
 updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 );`)
 await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_idx ON invoices(invoice_number);`)
 await db.run(sql`CREATE INDEX IF NOT EXISTS invoices_updated_at_idx ON invoices(updated_at);`)
 await db.run(sql`CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);`)
 await db.run(sql`CREATE TABLE IF NOT EXISTS invoices_vehicles (
 _order integer NOT NULL,
 _parent_id integer NOT NULL,
 id text PRIMARY KEY NOT NULL,
 vin text NOT NULL,
 make text NOT NULL,
 model text NOT NULL,
 lot text NOT NULL,
 year numeric,
 delivery numeric NOT NULL DEFAULT 0,
 shipping numeric NOT NULL DEFAULT 0,
 dealer_fee numeric NOT NULL DEFAULT 0,
 storage numeric NOT NULL DEFAULT 0,
 late_fee numeric NOT NULL DEFAULT 0,
 ev_fee numeric NOT NULL DEFAULT 0,
 add_services numeric NOT NULL DEFAULT 0,
 total numeric,
 FOREIGN KEY (_parent_id) REFERENCES invoices(id) ON UPDATE no action ON DELETE cascade
 );`)
 await db.run(sql`CREATE INDEX IF NOT EXISTS invoices_vehicles_order_idx ON invoices_vehicles(_order);`)
 await db.run(sql`CREATE INDEX IF NOT EXISTS invoices_vehicles_parent_id_idx ON invoices_vehicles(_parent_id);`)
 await db.run(sql`CREATE INDEX IF NOT EXISTS invoices_vehicles_vin_idx ON invoices_vehicles(vin);`)
 await db.run(sql`CREATE TABLE IF NOT EXISTS invoice_settings (id integer PRIMARY KEY NOT NULL, account text, routing_electronic text, routing_wire text, updated_at text, created_at text);`)
}
// Business records survive an application rollback.
export async function down(_args:MigrateDownArgs):Promise<void>{}
