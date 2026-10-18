import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({db}: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS catalog_guard (
    key text NOT NULL, hour integer NOT NULL, minute integer NOT NULL,
    minute_count integer NOT NULL, total integer NOT NULL, blocked integer NOT NULL,
    last_blocked integer NOT NULL, last_reason text NOT NULL,
    ip text NOT NULL, agent text NOT NULL, scope text NOT NULL, verified text NOT NULL,
    last_seen text NOT NULL, PRIMARY KEY (key,hour)
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS catalog_guard_hour_idx ON catalog_guard (hour);`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {}
