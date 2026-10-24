import { cms } from '@/lib/data'
import { database } from '@/lib/database'
import { readSettings,writeSettings,listPosts,getPost,insertDraft,saveDraft,approve,cancel,q } from '@/lib/social/store'
import { SocialError,text,settingsInput,scheduledDate } from '@/lib/social/validation'
import { makeDraft,articleOptions,prepareDrafts,validateSource,starterTips } from '@/lib/social/sources'
import { metaConfig,verifyPage,verifyPublishedPost } from '@/lib/social/meta'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers})
async function admin(request:Request){
 const payload=await cms(),{user}=await payload.auth({headers:request.headers})
 if(user?.collection!=='users')throw new SocialError('Необходим е администраторски вход.',403)
 return {payload,user}
}
function failure(error:unknown){return error instanceof SocialError?json({error:error.message},error.status):json({error:'Действието не завърши. Обнови списъка, преди да опиташ отново.'},503)}
async function bodyOf(request:Request){
 const expected=new URL(process.env.NEXT_PUBLIC_SERVER_URL||'http://localhost:3000').origin
 if(request.headers.get('origin')!==expected||request.headers.get('sec-fetch-site')==='cross-site')throw new SocialError('Невалиден източник на заявката.',403)
 if(!request.headers.get('content-type')?.includes('application/json'))throw new SocialError('Очакват се JSON данни.',415)
 const reader=request.body?.getReader();if(!reader)throw new SocialError('Липсват данни.')
 const chunks:Uint8Array[]=[];let size=0
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();throw new SocialError('Твърде голяма заявка.',413)}chunks.push(value)}
 try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(data&&typeof data==='object'&&!Array.isArray(data))return data as Record<string,unknown>}catch{}
 throw new SocialError('Невалидни данни.')
}
export async function GET(request:Request){
 try{
  const {payload}=await admin(request),page=Number(new URL(request.url).searchParams.get('page')||1)
  if(!Number.isInteger(page)||page<1||page>167)throw new SocialError('Невалидна страница.')
  const state=await readSettings(payload),meta=metaConfig()
  return json({...await listPosts(payload,page),settings:state.settings,settingsRevision:state.revision,lastTick:state.last_tick,articles:await articleOptions(payload),tips:starterTips,connection:{configured:!!meta,pageId:meta?.pageId||'',cronConfigured:(process.env.SOCIAL_CRON_SECRET||'').length>=32}})
 }catch(error){return failure(error)}
}
export async function POST(request:Request){
 try{
  const {payload,user}=await admin(request),body=await bodyOf(request)
  const action=body.action
  if(action==='settings'){
   const state=await readSettings(payload),settings=settingsInput(body.settings as Record<string,unknown>,state.settings)
   const meta=metaConfig()
   if(settings.enabled&&(!meta||settings.verifiedPageId!==meta.pageId||(process.env.SOCIAL_CRON_SECRET||'').length<32))throw new SocialError('Първо свържи и провери страницата и настрой автоматичния график.')
   await writeSettings(payload,settings,Number(body.revision));return json({ok:true})
  }
  if(action==='verify'){
   const meta=metaConfig();if(!meta)throw new SocialError('Липсва конфигурацията за Facebook в хостинга.')
   const page=await verifyPage(meta),state=await readSettings(payload)
   await writeSettings(payload,{...state.settings,verifiedPageId:page.id,verifiedPageName:page.name,verifiedAt:new Date().toISOString(),enabled:state.settings.verifiedPageId===page.id&&state.settings.enabled},state.revision)
   return json({ok:true,page})
  }
  if(action==='prepare'){
   const state=await readSettings(payload)
   return json(await prepareDrafts(payload,state.settings))
  }
  if(action==='create'){
   const draft=await makeDraft(payload,body.kind,body.source,body.message)
   const id=await insertDraft(payload,draft)
   if(!id)throw new SocialError('Този материал вече е добавен или е достигнат лимитът от 5000 публикации.',409)
   return json({ok:true,id})
  }
  const post=await getPost(payload,text(body.id,40)),revision=Number(body.revision)
  if(!Number.isSafeInteger(revision)||revision!==post.revision)throw new SocialError('Публикацията е променена. Обнови.',409)
  if(action==='edit'){
   await saveDraft(payload,post,{message:text(body.message,2000),scheduled_at:body.date?scheduledDate(body.date):''},revision)
  }else if(action==='approve'){
   const state=await readSettings(payload),meta=metaConfig()
   if(!meta||state.settings.verifiedPageId!==meta.pageId)throw new SocialError('Първо провери правилната Facebook страница.')
   const delta=Date.parse(post.scheduled_at)-Date.now()
   if(!Number.isFinite(delta)||delta<600000||delta>90*86400000)throw new SocialError('Запази дата поне 10 минути напред и до 90 дни.')
   await validateSource(payload,post)
   await approve(payload,post,String(user.id),meta.pageId,revision)
  }else if(action==='cancel'){await cancel(payload,post.id,revision)
  }else if(action==='reconcile'){
   if(post.status!=='uncertain')throw new SocialError('Само неясен резултат изисква такава проверка.')
   const id=text(body.facebookId,80,false),meta=metaConfig()
   if(id){
    if(!meta||meta.pageId!==post.page_id)throw new SocialError('Свържи страницата, за която е одобрена публикацията.')
    await verifyPublishedPost(meta,id)
   }else if(body.confirmAbsent!==true)throw new SocialError('Първо провери страницата във Facebook.')
   const rows=await database(payload).all(q("UPDATE social_posts SET status=?,facebook_id=?,error_code='',approved_at='',updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND status='uncertain' RETURNING id",[id?'published':'draft',id,new Date().toISOString(),post.id,revision]))
   if(!rows.length)throw new SocialError('Записът е променен. Обнови.',409)
  }else throw new SocialError('Непознато действие.')
  return json({ok:true})
 }catch(error){return failure(error)}
}
