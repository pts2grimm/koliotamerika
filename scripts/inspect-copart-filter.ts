import assert from 'node:assert/strict'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=Date.now();const r=await fetch(url,init)
 console.log('REQUEST',JSON.stringify({path:url.pathname,auction:url.searchParams.get('auction'),type:url.searchParams.get('item_type'),fuel:url.searchParams.get('fuel_type__name'),status:r.status,ms:Date.now()-start}))
 return r
}})
const provider=createEridanProvider(transport)
try{
 for(const site of ['1','1,2','2']){
  const before=calls,start=Date.now()
  const data=await provider.search(new URLSearchParams({make:'BMW',model:'3 SERIES',year_from:'2013',site,fuel:'Gasoline',size:'12'}))
  assert(data.items.length>0)
  assert(data.items.every(c=>site.split(',').includes(String(c.site))&&c.make==='BMW'&&c.model==='3 SERIES'&&c.year>=2013&&c.fuel==='Gasoline'))
  console.log('EXACT_VERIFIED',JSON.stringify({site,ms:Date.now()-start,count:data.items.length,calls:calls-before,sites:data.items.map(c=>c.site),first:data.items.slice(0,2).map(c=>({lot:c.lot_id,title:c.title}))}))
 }
 assert(calls<=20)
 console.log('SWITCHING_VERIFIED',calls)
}catch(e){console.log('VERIFICATION_FAILED',e instanceof Error?e.message:'Unknown');process.exitCode=1}
