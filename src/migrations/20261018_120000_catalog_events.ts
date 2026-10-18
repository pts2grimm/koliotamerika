import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS catalog_events (
    id integer PRIMARY KEY NOT NULL, event text NOT NULL, subject text,
    customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
    kind text NOT NULL, section text NOT NULL, archive integer DEFAULT false,
    make text, model text, year_from text, year_to text, lot text, site text, vin text, query text,
    result_count numeric, outcome text, filters text,
    updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS catalog_events_event_idx ON catalog_events (event);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_subject_idx ON catalog_events (subject);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_customer_idx ON catalog_events (customer_id);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_kind_idx ON catalog_events (kind);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_make_idx ON catalog_events (make);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_lot_idx ON catalog_events (lot);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_created_at_idx ON catalog_events (created_at);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_updated_at_idx ON catalog_events (updated_at);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_events_subject_time_idx ON catalog_events (subject, created_at);`)
}
// Preserve the bounded journal if application code is rolled back.
export async function down(_args: MigrateDownArgs): Promise<void> {}
