import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
import { socialSchema } from '../lib/social/schema'
export async function up({db}:MigrateUpArgs) {
 for(const statement of socialSchema.split(';').map(s=>s.trim()).filter(Boolean))await db.execute(sql.raw(statement.replace(/\b(social_posts|social_settings)\b/g,'payload.$1')))
 await db.execute(sql`REVOKE ALL ON payload.social_posts, payload.social_settings FROM PUBLIC`)
 await db.execute(sql`DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON payload.social_posts, payload.social_settings FROM anon; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON payload.social_posts, payload.social_settings FROM authenticated; END IF; END $$;`)
}
export async function down(_args:MigrateDownArgs){throw new Error('Social publication history must not be dropped by rollback')}
