import type { Payload } from 'payload'
import { database } from '../database'
import { q, readSettings, claim, finish } from './store'
import { metaConfig, publishPage } from './meta'
import { prepareDrafts, validateSource } from './sources'
import { sofiaDate } from './validation'
import type { SocialPost } from './types'
export async function runSocial(payload:Payload,now=Date.now()){
 const db=database(payload),iso=new Date(now).toISOString()
 const config=await readSettings(payload)
 await db.run(q('UPDATE social_settings SET last_tick=? WHERE id=1',[iso]))
 // A process can die after Meta accepted the post; such rows must never be automatically resent.
 await db.run(q("UPDATE social_posts SET status='uncertain',error_code='WORKER_INTERRUPTED',revision=revision+1,updated_at=? WHERE status='publishing' AND started_at<?",[iso,new Date(now-10*60000).toISOString()]))
 let prepared={created:0,unfilled:0}
 if(config.settings.prepare){
  const day=sofiaDate(new Date(now))
  const lease=await db.all(q('UPDATE social_settings SET last_prepared=? WHERE id=1 AND last_prepared<>? RETURNING id',[day,day]))
  if(lease.length)prepared=await prepareDrafts(payload,config.settings,now)
 }
 const meta=metaConfig()
 if(!config.settings.enabled||!meta||config.settings.verifiedPageId!==meta.pageId||process.env.PREVIEW_MODE==='true'||process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/,'')!=='https://koliotamerika.bg')return {...prepared,sent:0,paused:true}
 const due=await db.all<SocialPost>(q("SELECT * FROM social_posts WHERE status='scheduled' AND scheduled_at<=? ORDER BY scheduled_at LIMIT 3",[iso]))
 let sent=0
 for(const candidate of due){
  // Re-read the pause switch before claiming each item. A request already in flight cannot be recalled.
  if(!(await readSettings(payload)).settings.enabled)break
  const post=await claim(payload,candidate.id,iso)
  if(!post)continue
  if(post.page_id!==meta.pageId){await finish(payload,post.id,'failed','PAGE_CHANGED');continue}
  if(now-Date.parse(post.scheduled_at)>30*60000){await finish(payload,post.id,'failed','MISSED_WINDOW');continue}
  try{await validateSource(payload,post)}catch{await finish(payload,post.id,'failed','SOURCE_UNAVAILABLE');continue}
  const latest=(await readSettings(payload)).settings
  if(!latest.enabled||latest.verifiedPageId!==meta.pageId){
   await db.run(q("UPDATE social_posts SET status='scheduled',started_at='',revision=revision+1 WHERE id=? AND status='publishing'",[post.id]))
   break
  }
  const result=await publishPage(meta,post.message,post.link)
  await finish(payload,post.id,result.status,result.code||'',result.id||'')
  if(result.status==='published')sent++
 }
 return {...prepared,sent,paused:false}
}
