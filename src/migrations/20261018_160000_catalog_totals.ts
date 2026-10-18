import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // No collection, individual event ID, timestamp, customer or session column.
  await db.run(sql`CREATE TABLE IF NOT EXISTS catalog_totals (
    day text NOT NULL, kind text NOT NULL, section text NOT NULL, archive integer NOT NULL,
    make text NOT NULL, model text NOT NULL, lot text NOT NULL, site text NOT NULL, outcome text NOT NULL,
    count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
    PRIMARY KEY (day, kind, section, archive, make, model, lot, site, outcome)
  );`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {}
