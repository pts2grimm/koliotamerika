import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
export async function up({ db }: MigrateUpArgs): Promise<void> {
 const columns=await db.all<{name:string}>(sql`PRAGMA table_info("calculator_settings")`)
 if(!columns.some(c=>c.name==='usd_to_eur')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN usd_to_eur numeric NOT NULL DEFAULT 0.9`)
 if(!columns.some(c=>c.name==='shipping_usd')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN shipping_usd numeric NOT NULL DEFAULT 1000`)
 if(!columns.some(c=>c.name==='insurance_usd')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN insurance_usd numeric NOT NULL DEFAULT 200`)
 if(!columns.some(c=>c.name==='document_usd')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN document_usd numeric NOT NULL DEFAULT 20`)
 if(!columns.some(c=>c.name==='port_handling_eur')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN port_handling_eur numeric NOT NULL DEFAULT 300`)
 if(!columns.some(c=>c.name==='delivery_eur')) await db.run(sql`ALTER TABLE calculator_settings ADD COLUMN delivery_eur numeric NOT NULL DEFAULT 900`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {}
