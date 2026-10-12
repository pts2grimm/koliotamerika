import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=Date.now();const r=await fetch(url,init)
 console.log('REQUEST',JSON.stringify({path:url.pathname,params:Object.fromEntries(url.searchParams),status:r.status,ms:Date.now()-start}))
 if(r.ok){const d:any=await r.clone().json();console.log('RESPONSE',JSON.stringify(Array.isArray(d)?d:{page:d.page,hasNext:d.has_next,count:d.items?.length,first:d.items?.slice(0,2).map((c:any)=>({id:c.id,lot:c.lot_number,make:c.make?.name,model:c.model?.name,year:c.year,fuel:c.fuel,type:c.item_type}))}))}
 return r
}})
const provider=createEridanProvider(transport)
try{
 const start=Date.now();const data=await provider.search(new URLSearchParams({make:'BMW',model:'3 SERIES',year_from:'2013',site:'1',fuel:'Gasoline',size:'12'}))
 console.log('EXACT_RESULT',JSON.stringify({ms:Date.now()-start,count:data.items.length,calls,first:data.items.slice(0,3).map(c=>({title:c.title,site:c.site,fuel:c.fuel}))}))
}catch(e){console.log('EXACT_FAILURE',e instanceof Error?e.message:'Unknown')}
const url='https://darkturquoise-duck-750266.hostingersite.com/targove?make=BMW&model=3+SERIES&year_from=2013&year_to=&vehicle_type=&site=1&fuel=Gasoline'
const r=await fetch(url,{signal:AbortSignal.timeout(60000)});const html=await r.text()
console.log('PUBLIC_EXACT',JSON.stringify({status:r.status,badges:[...html.matchAll(/class="car-badge"[^>]*>([^<]+)</g)].map(m=>m[1]),empty:html.match(/class="empty-state"[\s\S]*?<\/div>/)?.[0]?.replace(/<[^>]+>/g,' ').slice(0,800)}))
