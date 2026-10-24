import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'
import { socialSchema } from '../../src/lib/social/schema'
import { insertDraft,readSettings,writeSettings,getPost,saveDraft,approve,claim,finish,q } from '../../src/lib/social/store'
import { database } from '../../src/lib/database'
async function exercise(payload:Payload){
 const initial=await readSettings(payload)
 assert.equal(initial.settings.enabled,false)
 await writeSettings(payload,{...initial.settings,time:'19:30'},initial.revision)
 await assert.rejects(()=>writeSettings(payload,initial.settings,initial.revision))
 const input={source_key:'same-source',slot:'same-slot',kind:'tip',title:'Съвет',message:'Текст',link:'https://koliotamerika.bg/blog/'}
 const ids=await Promise.all(Array.from({length:6},()=>insertDraft(payload,input)))
 assert.equal(ids.filter(Boolean).length,1)
 const id=ids.find(Boolean)!
 let post=await getPost(payload,id)
 await saveDraft(payload,post,{message:'Редактиран текст',scheduled_at:'2026-10-24T12:00:00.000Z'},post.revision)
 await assert.rejects(()=>saveDraft(payload,post,{message:'Остарял текст',scheduled_at:''},post.revision))
 post=await getPost(payload,id)
 await approve(payload,post,'1','123456',post.revision)
 const claims=await Promise.all(Array.from({length:6},()=>claim(payload,id,'2026-10-24T12:01:00.000Z')))
 assert.equal(claims.filter(Boolean).length,1)
 const inFlight=await getPost(payload,id)
 await assert.rejects(()=>saveDraft(payload,inFlight,{message:'Cannot change in-flight',scheduled_at:''},inFlight.revision))
 await finish(payload,id,'uncertain','META_CONNECTION_UNCERTAIN')
 assert.equal(await claim(payload,id,'2026-10-24T12:02:00.000Z'),undefined)
 assert.equal((await getPost(payload,id)).status,'uncertain')
 await database(payload).run(q('DELETE FROM social_posts WHERE id=?',[id]))
 console.log('Social store concurrency, approval and revision checks passed:',payload.db.name)
}
const sqlite=createClient({url:'file::memory:'}),db=drizzle(sqlite)
try{
 for(const statement of socialSchema.split(';').filter(s=>s.trim()))await db.run(sql.raw(statement))
 await exercise({db:{name:'sqlite',drizzle:db}} as unknown as Payload)
}finally{sqlite.close()}
const uri=process.env.DATABASE_URI||''
if(!/^postgresql:\/\/[^@]+@127\.0\.0\.1:5432\//.test(uri))throw new Error('Isolated PostgreSQL fixture required')
const pool=new Pool({connectionString:uri})
try{await exercise({db:{name:'postgres',pool}} as unknown as Payload)}finally{await pool.end()}
