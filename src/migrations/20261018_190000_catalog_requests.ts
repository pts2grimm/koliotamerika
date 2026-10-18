import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({db}: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS catalog_requests (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at text NOT NULL, kind text NOT NULL, provider text NOT NULL,
    make text NOT NULL, model text NOT NULL, lot text NOT NULL, site text NOT NULL,
    year_from text NOT NULL, year_to text NOT NULL, page integer NOT NULL,
    outcome text NOT NULL, result_count integer, duration_ms integer NOT NULL
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_requests_created_idx ON catalog_requests (created_at);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_requests_kind_created_idx ON catalog_requests (kind,created_at);`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {}
