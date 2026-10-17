import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS consent_events (
    id integer PRIMARY KEY NOT NULL,
    event text NOT NULL,
    customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
    subject text NOT NULL,
    analytics integer NOT NULL DEFAULT false,
    marketing integer NOT NULL DEFAULT false,
    action text NOT NULL,
    policy_version text NOT NULL,
    updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS consent_events_customer_idx ON consent_events (customer_id);`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS consent_events_event_idx ON consent_events (event);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS consent_events_subject_idx ON consent_events (subject);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS consent_events_created_at_idx ON consent_events (created_at);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS consent_events_updated_at_idx ON consent_events (updated_at);`)
}
// Retain the audit if application code is rolled back. No auth/content tables are changed.
export async function down(_args: MigrateDownArgs): Promise<void> {}
