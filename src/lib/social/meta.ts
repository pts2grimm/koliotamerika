import { SocialError } from './validation'
export type MetaConfig={pageId:string;token:string;version:string}
export function metaConfig(env:NodeJS.ProcessEnv=process.env):MetaConfig|null {
 const pageId=env.FACEBOOK_PAGE_ID||'',token=env.FACEBOOK_PAGE_ACCESS_TOKEN||'',version=env.FACEBOOK_GRAPH_VERSION||'v26.0'
 if(!/^\d{5,30}$/.test(pageId)||!token||!/^v\d{1,3}\.\d{1,2}$/.test(version))return null
 return {pageId,token,version}
}
export type MetaResult={status:'published'|'failed'|'uncertain';id?:string;code?:string}
export async function verifyPage(config:MetaConfig,request:typeof fetch=fetch) {
 try {
  const response=await request('https://graph.facebook.com/'+config.version+'/'+config.pageId+'?fields=id,name',{headers:{Authorization:'Bearer '+config.token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
  const data=await response.json()
  if(!response.ok||data.id!==config.pageId||typeof data.name!=='string')throw new Error()
  return {id:data.id as string,name:data.name.slice(0,200) as string}
 }catch{throw new SocialError('Meta не потвърди страницата. Провери Page ID, Page Access Token и разрешенията в Meta.',502)}
}
// A timeout or malformed response can hide an accepted post: never retry a write automatically.
export async function publishPage(config:MetaConfig,message:string,link:string,request:typeof fetch=fetch):Promise<MetaResult> {
 try {
  const response=await request('https://graph.facebook.com/'+config.version+'/'+config.pageId+'/feed',{
   method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({message,link,published:'true'}),redirect:'error',signal:AbortSignal.timeout(20000),
  })
  const data=await response.json()
  if(response.ok&&typeof data.id==='string'&&new RegExp('^'+config.pageId+'_\\d+$').test(data.id))return {status:'published',id:data.id}
  if(!response.ok&&response.status<500&&Number.isInteger(data?.error?.code))return {status:'failed',code:'META_'+data.error.code}
  return {status:'uncertain',code:'META_RESPONSE_UNCERTAIN'}
 }catch{return {status:'uncertain',code:'META_CONNECTION_UNCERTAIN'}}
}
export async function verifyPublishedPost(config:MetaConfig,id:string,request:typeof fetch=fetch) {
 if(!new RegExp('^'+config.pageId+'_\\d+$').test(id))throw new SocialError('Невалиден Post ID за свързаната страница.')
 try{
  const response=await request('https://graph.facebook.com/'+config.version+'/'+id+'?fields=id',{headers:{Authorization:'Bearer '+config.token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
  if(!response.ok||(await response.json()).id!==id)throw new Error()
 }catch{throw new SocialError('Meta не потвърди този публикуван пост.',502)}
}
