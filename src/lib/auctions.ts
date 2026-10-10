import 'server-only'
import { cache } from 'react'
import { createHash, randomUUID } from 'node:crypto'
import { createRequestCoalescer } from './coalesce-requests'
import { unstable_cache } from 'next/cache'
import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici'
import { createApiCarProvider } from './auction-providers/apicar'
import { createLegacyProvider } from './auction-providers/legacy'
import type { AuctionCar,AuctionTransport } from './auction-providers/types'
export type { AuctionCar,AuctionSearch } from './auction-providers/types'
const dispatcher=new EnvHttpProxyAgent()
const coalesce=createRequestCoalescer()
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
export function auctionProviderName(){return process.env.AUCTION_PROVIDER|| (process.env.APICAR_API_KEY?'apicar':'legacy')}
function provider(){const name=auctionProviderName();if(name==='apicar')return createApiCarProvider(transport('apicar'),process.env.APICAR_VIN_ENABLED==='true');if(name==='legacy')return createLegacyProvider(transport('legacy'));throw new Error(`Unsupported auction provider: ${name}`)}
const cachedSearch=unstable_cache(async(_provider:string,params:string)=>coalesce(JSON.stringify(['search',_provider,params]),()=>provider().search(new URLSearchParams(params))),['auction-search-v2'],{revalidate:60})
const cachedMakes=unstable_cache(async(_provider:string)=>coalesce(JSON.stringify(['makes',_provider]),()=>provider().makes()),['auction-makes-v2'],{revalidate:3600})
const cachedCar=unstable_cache(async(_provider:string,lot:string,site:string)=>coalesce(JSON.stringify(['car',_provider,lot,site]),()=>provider().detail(lot,site)),['auction-car-v2'],{revalidate:60})
const cachedLookup=unstable_cache(async(_provider:string,q:string)=>coalesce(JSON.stringify(['lookup',_provider,q]),()=>provider().lookup(q)),['auction-lookup-v2'],{revalidate:60})
export const searchAuctions=(params:string)=>{const sorted=new URLSearchParams(params);sorted.sort();return cachedSearch(auctionProviderName(),sorted.toString())}
export const auctionMakes=()=>cachedMakes(auctionProviderName())
// Metadata and page content can request the same lot concurrently on a cold cache.
export const auctionCar=cache((lot:string,site:string)=>cachedCar(auctionProviderName(),lot,site))
export const lookupAuction=(q:string)=>cachedLookup(auctionProviderName(),q)
export function auctionImages(car:AuctionCar) {
 const safe=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'&&['cs.copart.com','vis.iaai.com'].includes(url.hostname)}catch{return false}}
 const hd=(car.link_img_hd||[]).filter(safe)
 return [...new Set(hd.length?hd:(car.link_img_small||[]).filter(safe))]
}
export function auctionImage(car:AuctionCar){return auctionImages(car)[0]}
export function auctionCurrency(value:number,currency='USD'){return new Intl.NumberFormat('bg-BG',{style:'currency',currency:['USD','CAD','EUR','BGN'].includes(currency.toUpperCase())?currency.toUpperCase():'USD',maximumFractionDigits:0}).format(value)}
