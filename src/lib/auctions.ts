import 'server-only'
import { unstable_cache } from 'next/cache'
import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici'
import { createApiCarProvider } from './auction-providers/apicar'
import { createLegacyProvider } from './auction-providers/legacy'
import type { AuctionCar,AuctionTransport } from './auction-providers/types'
export type { AuctionCar,AuctionSearch } from './auction-providers/types'
const dispatcher=new EnvHttpProxyAgent()
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
  // Log operation/status/latency only, never headers, credentials, URLs or response bodies.
  if(process.env.AUCTION_LOGGING==='true')console.info(JSON.stringify({service:'auctions',provider,operation:/\/cars\/\d+$/.test(path)?'/cars/:lot':path,status,durationMs:Date.now()-start}))
 }
}}
export function auctionProviderName(){return process.env.AUCTION_PROVIDER|| (process.env.APICAR_API_KEY?'apicar':'legacy')}
function provider(){const name=auctionProviderName();if(name==='apicar')return createApiCarProvider(transport('apicar'),process.env.APICAR_VIN_ENABLED==='true');if(name==='legacy')return createLegacyProvider(transport('legacy'));throw new Error(`Unsupported auction provider: ${name}`)}
const cachedSearch=unstable_cache(async(_provider:string,params:string)=>provider().search(new URLSearchParams(params)),['auction-search-v2'],{revalidate:60})
const cachedMakes=unstable_cache(async(_provider:string)=>provider().makes(),['auction-makes-v2'],{revalidate:3600})
const cachedCar=unstable_cache(async(_provider:string,lot:string,site:string)=>provider().detail(lot,site),['auction-car-v2'],{revalidate:60})
const cachedLookup=unstable_cache(async(_provider:string,q:string)=>provider().lookup(q),['auction-lookup-v2'],{revalidate:60})
export const searchAuctions=(params:string)=>{const sorted=new URLSearchParams(params);sorted.sort();return cachedSearch(auctionProviderName(),sorted.toString())}
export const auctionMakes=()=>cachedMakes(auctionProviderName())
export const auctionCar=(lot:string,site:string)=>cachedCar(auctionProviderName(),lot,site)
export const lookupAuction=(q:string)=>cachedLookup(auctionProviderName(),q)
export function auctionImage(car:AuctionCar){const value=car.link_img_hd?.[0]||car.link_img_small?.[0];if(!value)return undefined;try{const u=new URL(value);return u.protocol==='https:'&&['cs.copart.com','vis.iaai.com'].includes(u.hostname)?value:undefined}catch{return undefined}}
export function auctionCurrency(value:number,currency='USD'){return new Intl.NumberFormat('bg-BG',{style:'currency',currency:['USD','CAD','EUR','BGN'].includes(currency.toUpperCase())?currency.toUpperCase():'USD',maximumFractionDigits:0}).format(value)}
