import { getPayload } from 'payload'
import config from '@payload-config'
import { catalogueRequestIP } from './catalog-request-ip'
import { canonicalIP, guardScope, safeAgent } from './catalog-guard'
import { purgeCatalogGuard, reserveCatalogRequest } from './catalog-guard-server'
import { verifyCrawler } from './verified-crawler'

let active=0, lastPurge=0, lastWarning=0
let cleanup:Promise<void>|undefined
export function guardMode() { return process.env.CATALOG_GUARD_MODE==='off'?'off':process.env.CATALOG_GUARD_MODE==='observe'?'observe':'enforce' }
function warn() {
  if(Date.now()-lastWarning>60000) {lastWarning=Date.now();console.warn('[catalogue-guard] Protection storage unavailable; catalogue requests temporarily paused.')}
}
function rejection(status:number,retryAfter:number,api:boolean) {
  const message='Твърде много заявки към каталога. Моля, изчакай и опитай отново.'
  const headers={'Cache-Control':'private, no-store','Retry-After':String(retryAfter),'Content-Type':api?'application/json; charset=utf-8':'text/html; charset=utf-8'}
  return new Response(api?JSON.stringify({error:message,retryAfter}):'<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Моля, изчакай · Коли от Америка</title><body style="background:#0c171d;color:#e4eff5;font:18px system-ui;padding:8vh 6vw"><main style="max-width:42rem;margin:auto"><h1>Моля, изчакай малко</h1><p>'+message+'</p><p>Опитай след '+retryAfter+' секунди.</p><a style="color:#7bd6dd" href="/">Към началната страница</a></main></body></html>',{status,headers})
}
// Return a response only when rejecting. This runs once at the HTTP boundary,
// before any page rendering, metadata generation, or related-vehicle lookup.
export async function protectCatalogue(request:{method:string;headers:Headers;nextUrl:{pathname:string}}, waitUntil:(task:Promise<unknown>)=>void):Promise<Response|undefined> {
  const scope=guardScope(request.nextUrl.pathname),mode=guardMode()
  if(!scope || !['GET','HEAD'].includes(request.method) || mode==='off' || process.env.TRUST_PROXY!=='true') return
  const ip=canonicalIP(catalogueRequestIP(request.headers,true)?.address || '')
  // Never aggregate all visitors behind an unknown IP into one blocking bucket.
  if(!ip) return
  const api=request.nextUrl.pathname.startsWith('/api/')
  if(active>=32) return rejection(503,5,api)
  active++
  const task=(async()=>{
    const payload=await getPayload({config})
    if(Date.now()-lastPurge>3600000) {
      cleanup ||= purgeCatalogGuard(payload).then(()=>{lastPurge=Date.now()}).finally(()=>{cleanup=undefined})
      await cleanup
    }
    const agent=safeAgent(request.headers.get('user-agent'))
    const verified=await verifyCrawler(ip,agent)
    return reserveCatalogRequest(payload,{ip,agent,scope,verified})
  })().finally(()=>{active--})
  // Keep the actual DB operation counted until it settles, including after a timeout.
  waitUntil(task.catch(()=>{warn()}))
  let timer:ReturnType<typeof setTimeout>|undefined
  try {
    const result=await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Guard deadline')),4000)})])
    if(result.reason==='capacity') return rejection(503,60,api)
    if(result.blocked && mode==='enforce') return rejection(429,result.retryAfter,api)
  } catch { warn();return rejection(503,10,api) } finally {if(timer)clearTimeout(timer)}
}
