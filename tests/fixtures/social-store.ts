import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'
import { socialSchema } from '../../src/lib/social/schema'
import { insertDraft,readSettings,writeSettings,getPost,saveDraft,approve,claim,finish,q } from '../../src/lib/social/store'
import { runSocial } from '../../src/lib/social/runner'
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
 // Exercise the runner against a mocked Meta transport, never a real Page.
 const env={...process.env},originalFetch=globalThis.fetch
 let writes=0
 try{
  Object.assign(process.env,{FACEBOOK_PAGE_ID:'123456',FACEBOOK_PAGE_ACCESS_TOKEN:'fixture-only',NEXT_PUBLIC_SERVER_URL:'https://koliotamerika.bg',PREVIEW_MODE:'false'})
  globalThis.fetch=(async(url:unknown)=>{
   assert.equal(url,'https://graph.facebook.com/v26.0/123456/feed')
   writes++
   return Response.json({id:'123456_7890'})
  }) as typeof fetch
  const settings=await readSettings(payload)
  await writeSettings(payload,{...settings.settings,prepare:false,enabled:true,verifiedPageId:'123456'},settings.revision)
  const draftId=(await insertDraft(payload,{...input,source_key:'runner',slot:'runner'}))!
  const now=Date.now()
  let draft=await getPost(payload,draftId)
  await saveDraft(payload,draft,{message:'Approved fixture',scheduled_at:new Date(now-60000).toISOString()},draft.revision)
  await runSocial(payload,now)
  assert.equal(writes,0,'An unapproved draft must not publish')
  draft=await getPost(payload,draftId)
  await approve(payload,draft,'1','123456',draft.revision)
  await runSocial(payload,now)
  await runSocial(payload,now)
  assert.equal(writes,1,'An approved post is only sent once')
  assert.equal((await getPost(payload,draftId)).status,'published')
  const unknownId=(await insertDraft(payload,{...input,source_key:'uncertain',slot:'uncertain'}))!
  let unknown=await getPost(payload,unknownId)
  await saveDraft(payload,unknown,{message:'Uncertain fixture',scheduled_at:new Date(now-60000).toISOString()},unknown.revision)
  unknown=await getPost(payload,unknownId);await approve(payload,unknown,'1','123456',unknown.revision)
  globalThis.fetch=(async()=>{writes++;throw new Error('timeout')}) as typeof fetch
  await runSocial(payload,now);await runSocial(payload,now)
  assert.equal(writes,2)
  assert.equal((await getPost(payload,unknownId)).status,'uncertain')
  await database(payload).run(q('DELETE FROM social_posts WHERE id IN (?,?)',[draftId,unknownId]))
  const reset=await readSettings(payload)
  await writeSettings(payload,{...reset.settings,enabled:false,verifiedPageId:''},reset.revision)
 }finally{
  globalThis.fetch=originalFetch
  for(const name of ['FACEBOOK_PAGE_ID','FACEBOOK_PAGE_ACCESS_TOKEN','NEXT_PUBLIC_SERVER_URL','PREVIEW_MODE']){if(env[name]===undefined)delete process.env[name];else process.env[name]=env[name]}
 }
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
