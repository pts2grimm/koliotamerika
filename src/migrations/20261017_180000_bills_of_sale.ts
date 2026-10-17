import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS bills_of_sale (
    id integer PRIMARY KEY NOT NULL,
    stock text NOT NULL,
    sale_date text NOT NULL,
    buyer_name text NOT NULL,
    buyer_address text NOT NULL,
    buyer_city text NOT NULL,
    buyer_postal_code text NOT NULL,
    buyer_country text NOT NULL,
    vin text NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    body text NOT NULL,
    cylinders text NOT NULL,
    buyer_phone text,
    buyer_home_phone text,
    buyer_work_phone text,
    buyer_state text,
    buyer_county text,
    buyer_license text,
    buyer_d_o_b text,
    buyer_license_expiry text,
    color1 text,
    color2 text,
    style text,
    transmission text,
    remarks text,
    year numeric NOT NULL,
    mileage numeric,
    vehicle_price numeric NOT NULL,
    shipping numeric NOT NULL DEFAULT 0,
    paid_amount numeric NOT NULL DEFAULT 0,
    total numeric,
    balance numeric,
    updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS bills_of_sale_stock_idx ON bills_of_sale (stock);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS bills_of_sale_vin_idx ON bills_of_sale (vin);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS bills_of_sale_updated_at_idx ON bills_of_sale (updated_at);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS bills_of_sale_created_at_idx ON bills_of_sale (created_at);`)
}
// Preserve issued business records on application rollback.
export async function down(_args: MigrateDownArgs): Promise<void> {}
