import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payload.catalog_totals (
      day text NOT NULL, kind text NOT NULL, section text NOT NULL, archive integer NOT NULL,
      make text NOT NULL, model text NOT NULL, lot text NOT NULL, site text NOT NULL, outcome text NOT NULL,
      count integer NOT NULL CHECK(count >= 0),
      PRIMARY KEY(day,kind,section,archive,make,model,lot,site,outcome)
    );
    CREATE TABLE IF NOT EXISTS payload.catalog_requests (
      id serial PRIMARY KEY, created_at text NOT NULL, kind text NOT NULL, provider text NOT NULL,
      make text NOT NULL, model text NOT NULL, lot text NOT NULL, site text NOT NULL,
      year_from text NOT NULL, year_to text NOT NULL, page integer NOT NULL,
      outcome text NOT NULL, result_count integer, duration_ms integer NOT NULL,
      vin text NOT NULL DEFAULT '', ip text NOT NULL DEFAULT '', ip_source text NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS catalog_requests_created_at_idx ON payload.catalog_requests(created_at);
    CREATE INDEX IF NOT EXISTS catalog_requests_kind_created_at_idx ON payload.catalog_requests(kind,created_at);
    CREATE TABLE IF NOT EXISTS payload.catalog_guard (
      key text NOT NULL, hour integer NOT NULL, minute integer NOT NULL, minute_count integer NOT NULL,
      total integer NOT NULL, blocked integer NOT NULL, last_blocked integer NOT NULL,
      last_reason text NOT NULL, ip text NOT NULL, agent text NOT NULL, scope text NOT NULL,
      verified text NOT NULL, last_seen text NOT NULL, PRIMARY KEY(key,hour)
    );
    CREATE INDEX IF NOT EXISTS catalog_guard_hour_idx ON payload.catalog_guard(hour);
    REVOKE ALL ON SCHEMA payload FROM PUBLIC;
    REVOKE ALL ON ALL TABLES IN SCHEMA payload FROM PUBLIC;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA payload FROM PUBLIC;
  `)
  // Supabase roles are absent in isolated PostgreSQL tests.
  await db.execute(sql`DO $$ BEGIN
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      REVOKE ALL ON SCHEMA payload FROM anon;
      REVOKE ALL ON ALL TABLES IN SCHEMA payload FROM anon;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA payload FROM anon;
    END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
      REVOKE ALL ON SCHEMA payload FROM authenticated;
      REVOKE ALL ON ALL TABLES IN SCHEMA payload FROM authenticated;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA payload FROM authenticated;
    END IF;
  END $$;`)
}
export async function down(_args: MigrateDownArgs) {
  throw new Error('Operational and business data must not be dropped by rollback')
}
export const operationalMigration = { name: '20261022_operational_tables', up, down }
