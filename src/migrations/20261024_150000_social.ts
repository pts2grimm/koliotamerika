import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-sqlite'
import { socialSchema } from '../lib/social/schema'
export async function up({db}:MigrateUpArgs) {
 for(const statement of socialSchema.split(';').map(s=>s.trim()).filter(Boolean))await db.run(sql.raw(statement))
}
export async function down(_args:MigrateDownArgs){throw new Error('Social publication history must not be dropped by rollback')}
