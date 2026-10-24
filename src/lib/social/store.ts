import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { database, sql } from '../database'
import { defaultSettings, type SocialSettings, type SocialPost } from './types'
import { SocialError } from './validation'
// Only static statements call q; all values remain bound parameters in both adapters.
export function q(statement:string,values:unknown[]=[]){
 const parts=statement.split('?')
 if(parts.length!==values.length+1)throw new Error('Parameter count mismatch')
 return sql.join(parts.flatMap((part,i)=>i<values.length?[sql.raw(part),sql.param(values[i])]:[sql.raw(part)]),sql.raw(''))
}
const stamp=()=>new Date().toISOString()
export async function readSettings(payload:Payload) {
 const db=database(payload)
 type Row={config:string;revision:number;last_prepared:string;last_tick:string}
 let [row]=await db.all<Row>(q('SELECT config,revision,last_prepared,last_tick FROM social_settings WHERE id=1'))
 if(!row){
  await db.run(q('INSERT INTO social_settings(id,config) VALUES(1,?) ON CONFLICT(id) DO NOTHING',[JSON.stringify(defaultSettings)]))
  ;[row]=await db.all<Row>(q('SELECT config,revision,last_prepared,last_tick FROM social_settings WHERE id=1'))
 }
 return {...row,settings:{...defaultSettings,...JSON.parse(row.config)} as SocialSettings}
}
export async function writeSettings(payload:Payload,settings:SocialSettings,revision:number) {
 const result=await database(payload).all(q('UPDATE social_settings SET config=?,revision=revision+1 WHERE id=1 AND revision=? RETURNING id',[JSON.stringify(settings),revision]))
 if(!result.length)throw new SocialError('Настройките са променени в друг прозорец. Обнови.',409)
}
export async function listPosts(payload:Payload,page=1) {
 const rows=await database(payload).all<SocialPost>(q('SELECT * FROM social_posts ORDER BY created_at DESC,id DESC LIMIT 31 OFFSET ?',[(page-1)*30]))
 return {posts:rows.slice(0,30),hasNext:rows.length>30,page}
}
export async function getPost(payload:Payload,id:string) {
 const [post]=await database(payload).all<SocialPost>(q('SELECT * FROM social_posts WHERE id=?',[id]))
 if(!post)throw new SocialError('Публикацията не е намерена.',404)
 return post
}
export async function insertDraft(payload:Payload,input:{source_key:string;kind:string;title:string;message:string;link:string;scheduled_at?:string;slot?:string}) {
 const now=stamp(),id=randomUUID()
 const rows=await database(payload).atomicAll<{id:string}>(q(
  'INSERT INTO social_posts(id,source_key,slot,kind,title,message,link,scheduled_at,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM social_posts)<5000 ON CONFLICT DO NOTHING RETURNING id',
  [id,input.source_key,input.slot||id,input.kind,input.title,input.message,input.link,input.scheduled_at||'',now,now]),'social-drafts')
 return rows[0]?.id||null
}
export async function saveDraft(payload:Payload,post:SocialPost,input:{message:string;scheduled_at:string},revision:number){
 const rows=await database(payload).all(q("UPDATE social_posts SET message=?,scheduled_at=?,status='draft',approved_at='',approved_by='',page_id='',error_code='',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status IN ('draft','scheduled','failed','cancelled') RETURNING id",[input.message,input.scheduled_at,stamp(),post.id,revision]))
 if(!rows.length)throw new SocialError('Публикацията е променена или вече се изпраща. Обнови.',409)
}
export async function approve(payload:Payload,post:SocialPost,user:string,pageId:string,revision:number) {
 const now=stamp()
 const rows=await database(payload).all(q("UPDATE social_posts SET status='scheduled',approved_by=?,approved_at=?,page_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status='draft' RETURNING id",[user,now,pageId,now,post.id,revision]))
 if(!rows.length)throw new SocialError('Запази редакциите като чернова преди одобрение.',409)
}
export async function cancel(payload:Payload,id:string,revision:number) {
 const rows=await database(payload).all(q("UPDATE social_posts SET status='cancelled',approved_at='',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status IN ('draft','scheduled','failed') RETURNING id",[stamp(),id,revision]))
 if(!rows.length)throw new SocialError('Вече се изпраща, публикуван е или е променен. Обнови.',409)
}
export async function finish(payload:Payload,id:string,status:'published'|'failed'|'uncertain',code='',facebookId='') {
 await database(payload).run(q("UPDATE social_posts SET status=?,error_code=?,facebook_id=?,published_at=?,updated_at=?,revision=revision+1 WHERE id=? AND status='publishing'",[status,code,facebookId,status==='published'?stamp():'',stamp(),id]))
}
export async function claim(payload:Payload,id:string,now=new Date().toISOString()) {
 const rows=await database(payload).all<SocialPost>(q("UPDATE social_posts SET status='publishing',started_at=?,updated_at=?,revision=revision+1 WHERE id=? AND status='scheduled' AND approved_at<>'' AND scheduled_at<=? RETURNING *",[now,now,id,now]))
 return rows[0]
}
