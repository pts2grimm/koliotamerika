import { formatCurrency } from './currency'
import { catalogueSort } from './auction-sorting'
import { sameEridanMake } from './auction-providers/make-aliases'
import 'server-only'
import { cache } from 'react'
import { createHash, randomUUID } from 'node:crypto'
import { createRequestCoalescer } from './coalesce-requests'
import { createAuctionSnapshots } from './auction-snapshots'
import { unstable_cache } from 'next/cache'
import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici'
import { createEridanProvider } from './auction-providers/eridan'
import { createEridanTransport } from './auction-providers/eridan-transport'
import { createApiCarProvider } from './auction-providers/apicar'
import { createLegacyProvider } from './auction-providers/legacy'
import { isEridanRoadMake, eridanTypesForFilter } from './auction-providers/eridan-scope'
import type { AuctionCar,AuctionTransport } from './auction-providers/types'
export type { AuctionCar,AuctionSearch } from './auction-providers/types'
const dispatcher=new EnvHttpProxyAgent()
const coalesce=createRequestCoalescer()
const catalogueSnapshots=createAuctionSnapshots()
const instance=randomUUID().slice(0,8)
let blockedUntil=0
let windowStart=0,requests=0
function transport(provider:'apicar'|'legacy'):AuctionTransport{return async(path,params)=>{
 const direct=provider==='apicar'
 if(direct&&!process.env.APICAR_API_KEY)throw new Error('APICAR_API_KEY is missing')
 if(direct&&Date.now()<blockedUntil)throw new Error('ApiCar is temporarily paused after an access or rate limit error')
 if(direct){if(Date.now()-windowStart>=60000){windowStart=Date.now();requests=0}if(requests>=20)throw new Error('ApiCar local request budget reached');requests++}
 const base=direct?'https://api.apicar.store/api':process.env.AUCTION_API_BASE_URL||'https://koliotamerika.bg/wp-json/koa/v1'
 const url=new URL(`${base.replace(/\/$/,'')}${path}`);url.search=params.toString()
 const start=Date.now()
 let status=0
 try{
  const response=await proxyFetch(url,{dispatcher,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(direct?{'api-key':process.env.APICAR_API_KEY!}:{})}})
  status=response.status
  if(!response.ok){await response.body?.cancel();if(direct&&(status===401||status===403||status===429))blockedUntil=Date.now()+(status===429?60000:30*60000);throw new Error(`Auction provider HTTP ${status}`)}
  return await response.json()
 }finally{
  // Log operational fields and a query fingerprint, never credentials, raw filter text, VINs, URLs or bodies.
  if(process.env.AUCTION_LOGGING==='true')console.info(JSON.stringify({service:'auctions',instance,provider,queryHash:createHash('sha256').update(JSON.stringify([provider,path,[...params].sort()])).digest('hex').slice(0,16),site:params.get('site'),page:params.get('page'),size:params.get('size'),operation:/\/cars\/\d+$/.test(path)?'/cars/:lot':path,status,durationMs:Date.now()-start}))
 }
}}
const eridanTransport=createEridanTransport({
 apiKey:process.env.ERIDAN_API_KEY,testBaseURL:process.env.ERIDAN_TEST_API_BASE_URL,
 fetch:(url,init)=>proxyFetch(url,{dispatcher,method:init.method,redirect:init.redirect,signal:init.signal,headers:init.headers as Record<string,string>}),
})
const eridanReferences=unstable_cache(async(path:string,params:string)=>coalesce(JSON.stringify(['eridan-reference',path,params]),()=>eridanTransport(path,new URLSearchParams(params))),['eridan-references-v2-scoped'],{revalidate:3600})
const eridanRequest:AuctionTransport=async(path,params)=>{
 const start=Date.now()
 try{
  return await (path==='/item_types'||path==='/fuel_types'||path==='/models'?eridanReferences(path,params.toString()):coalesce(JSON.stringify(['eridan-request',path,[...params].sort()]),()=>eridanTransport(path,params)))
 }catch(error){
  // Log only known operational categories, never response bodies, keys, VINs or query values.
  const message=error instanceof Error?error.message:''
  const reason=message==='Eridan request timed out'?'timeout':
   message==='Eridan connection failed'?'connection':
   message==='Eridan is temporarily paused after an access or rate limit error'?'paused':
   /^Auction provider HTTP \d{3}$/.test(message)?message.replace('Auction provider HTTP ','http_'):'invalid_response'
  console.warn(JSON.stringify({service:'auctions',provider:'eridan',operation:path,reason,durationMs:Date.now()-start}))
  throw error
 }
}
export function auctionProviderName(){return process.env.AUCTION_PROVIDER|| (process.env.APICAR_API_KEY?'apicar':'legacy')}
function provider(){const name=auctionProviderName();if(name==='eridan')return createEridanProvider(eridanRequest);if(name==='apicar')return createApiCarProvider(transport('apicar'),process.env.APICAR_VIN_ENABLED==='true');if(name==='legacy')return createLegacyProvider(transport('legacy'));throw new Error(`Unsupported auction provider: ${name}`)}
const cachedSearch=unstable_cache(async(_provider:string,params:string)=>{
 const data=await coalesce(JSON.stringify(['search',_provider,params]),()=>provider().search(new URLSearchParams(params)))
 return {data,fetchedAt:Date.now()}
},['auction-search-v14-renegade-family'],{revalidate:60})
const cachedMakes=unstable_cache(async(_provider:string)=>coalesce(JSON.stringify(['makes',_provider]),()=>provider().makes()),['auction-makes-v7-merged-aliases'],{revalidate:3600})
const cachedCar=unstable_cache(async(_provider:string,lot:string,site:string)=>coalesce(JSON.stringify(['car',_provider,lot,site]),()=>provider().detail(lot,site)),['auction-car-v8-seller-category'],{revalidate:60})
const cachedLookup=unstable_cache(async(_provider:string,q:string,lifecycle:'active'|'sold')=>coalesce(JSON.stringify(['lookup',_provider,q,lifecycle]),()=>provider().lookup(q,lifecycle)),['auction-lookup-v6-active-or-archive'],{revalidate:60})
export async function searchAuctions(params:string){
 const sorted=new URLSearchParams(params)
 const name=auctionProviderName()
 if(name==='eridan')sorted.set('sort',catalogueSort(sorted.get('sort')))
 sorted.sort()
 const result=await cachedSearch(name,sorted.toString())
 if(name==='eridan')catalogueSnapshots.remember(result.data.items,result.fetchedAt)
 return result.data
}
export const auctionMakes=()=>cachedMakes(auctionProviderName())
const cachedModels=unstable_cache(async(_provider:string,make:string,vehicleType:string)=>coalesce(JSON.stringify(['models',_provider,make,vehicleType]),async()=>{const adapter=provider();return adapter.models?adapter.models(make,vehicleType):(await adapter.makes())[make]||[]}),['auction-models-v7-renegade-family'],{revalidate:3600})
export async function auctionModels(make:string,vehicleType='') {
 const types=eridanTypesForFilter(vehicleType)
 if(!types.length)throw new Error('Invalid vehicle type')
 if(vehicleType&&!types.some(type=>isEridanRoadMake(make,type)))return []
 if(!make.trim()||make.length>100)throw new Error('Invalid make')
 const makes=await auctionMakes()
 const canonical=Object.keys(makes).find(name=>auctionProviderName()==='eridan'?sameEridanMake(name,make):name.trim().toLowerCase()===make.trim().toLowerCase())
 if(!canonical)return []
 return auctionProviderName()==='eridan'?cachedModels('eridan',canonical,vehicleType):makes[canonical]||[]
}
// Metadata and page content can request the same lot concurrently on a cold cache.
export const auctionCar=cache((lot:string,site:string)=>{
 const name=auctionProviderName()
 const snapshot=name==='eridan'?catalogueSnapshots.get(lot,site):undefined
 return snapshot?.auction_status==='active'?Promise.resolve(snapshot):cachedCar(name,lot,site)
})
export const lookupAuction=(q:string,archive=false)=>cachedLookup(auctionProviderName(),q,archive?'sold':'active')
export function auctionImages(car:AuctionCar) {
 const safe=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&['cs.copart.com','vis.iaai.com',...(auctionProviderName()==='eridan'?(process.env.ERIDAN_IMAGE_HOSTS||'').split(',').map(host=>host.trim().toLowerCase()).filter(host=>/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(host)):[])].includes(url.hostname)}catch{return false}}
 const hd=(car.link_img_hd||[]).filter(safe)
 return [...new Set(hd.length?hd:(car.link_img_small||[]).filter(safe))]
}
export function auctionImage(car:AuctionCar){return auctionImages(car)[0]}
export function auctionCurrency(value:number,currency='USD'){return formatCurrency(value,['USD','CAD','EUR','BGN'].includes(currency.toUpperCase())?currency.toUpperCase():'USD',0)}
