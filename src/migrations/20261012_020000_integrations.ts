import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`integrations\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`enabled\` integer DEFAULT false,
    \`hostname\` text NOT NULL DEFAULT 'koliotamerika.bg',
    \`installation\` text NOT NULL DEFAULT 'direct',
    \`ga_enabled\` integer DEFAULT false,
    \`ga_id\` text,
    \`ads_enabled\` integer DEFAULT false,
    \`ads_id\` text,
    \`ads_lead_label\` text,
    \`gtm_id\` text,
    \`pixel_enabled\` integer DEFAULT false,
    \`pixel_id\` text,
    \`capi_enabled\` integer DEFAULT false,
    \`meta_access_token\` text,
    \`meta_test_code\` text,
    \`clarity_enabled\` integer DEFAULT false,
    \`clarity_id\` text,
    \`google_verification\` text,
    \`bing_verification\` text,
    \`meta_verification\` text,
    \`updated_at\` text,
    \`created_at\` text
  );`)
}

// Keep credentials and configuration on rollback; no existing user or content tables change.
export async function down(_args: MigrateDownArgs): Promise<void> {}
