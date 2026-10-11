import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const columns = await db.all<{ name: string }>(sql`PRAGMA table_info("site_settings")`)
  if (!columns.some(column => column.name === 'us_address')) {
    await db.run(sql`ALTER TABLE site_settings ADD COLUMN us_address text`)
  }
  if (!columns.some(column => column.name === 'google_maps_u_r_l')) {
    await db.run(sql`ALTER TABLE site_settings ADD COLUMN google_maps_u_r_l text`)
  }
}

// Retain optional contact values if application code is rolled back.
export async function down(_args: MigrateDownArgs): Promise<void> {}
