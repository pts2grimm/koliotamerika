import {sql,type MigrateUpArgs,type MigrateDownArgs} from '@payloadcms/db-sqlite'
export async function up({db}:MigrateUpArgs){
 for(const table of ['pages','cars','homepage']){
  const columns=await db.all<{name:string}>(sql.raw('PRAGMA table_info("'+table+'")'))
  if(!columns.some(column=>column.name==='focus_keyphrase'))await db.run(sql.raw('ALTER TABLE "'+table+'" ADD COLUMN "focus_keyphrase" text'))
 }
}
export async function down(_args:MigrateDownArgs){throw new Error('Keep editorial keyphrases when rolling back application code; do not drop editor data.')}
