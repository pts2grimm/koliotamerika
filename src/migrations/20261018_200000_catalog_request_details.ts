import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({db}: MigrateUpArgs): Promise<void> {
  const columns=await db.all<{name:string}>(sql`PRAGMA table_info(catalog_requests)`)
  const names=new Set(columns.map(column=>column.name))
  if (!names.has('vin')) await db.run(sql`ALTER TABLE catalog_requests ADD COLUMN vin text NOT NULL DEFAULT '';`)
  if (!names.has('ip')) await db.run(sql`ALTER TABLE catalog_requests ADD COLUMN ip text NOT NULL DEFAULT '';`)
  if (!names.has('ip_source')) await db.run(sql`ALTER TABLE catalog_requests ADD COLUMN ip_source text NOT NULL DEFAULT '';`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {}
