import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-postgres'
export async function up({db}:MigrateUpArgs){
 for(const table of ['pages','cars','homepage']){
  await db.execute(sql.raw('ALTER TABLE "payload"."'+table+'" ADD COLUMN IF NOT EXISTS "focus_keyphrase" varchar'))
 }
}
export async function down(_args:MigrateDownArgs){throw new Error('Keep editorial keyphrases when rolling back application code; do not drop editor data.')}
