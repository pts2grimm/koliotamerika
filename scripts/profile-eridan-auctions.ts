import assert from 'node:assert/strict'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=performance.now();const response=await fetch(url,init)
 console.log('UPSTREAM',JSON.stringify({path:url.pathname,auction:url.searchParams.get('auction'),type:url.searchParams.get('item_type'),page:url.searchParams.get('page'),size:url.searchParams.get('page_size'),status:response.status,ms:Math.round(performance.now()-start)}))
 return response
}})
const provider=createEridanProvider(transport)
try{
 let firstIds=new Set<string>()
 for(const page of ['1','2']){
  const started=performance.now(),before=calls
  const data=await provider.search(new URLSearchParams({site:'1,2',size:'12',page}))
  assert.equal(data.items.length,24)
  assert.deepEqual(data.items.map(c=>c.site),Array.from({length:24},(_,i)=>i%2+1))
  assert(data.items.every(c=>c.link_img_hd?.length))
  if(page==='1'){firstIds=new Set(data.items.map(c=>c.id));assert(calls-before<=5)}
  else assert(data.items.every(c=>!firstIds.has(c.id)))
  console.log('FULL_MIX_SUCCESS',JSON.stringify({page,ms:Math.round(performance.now()-started),count:data.items.length,calls:calls-before,sites:data.items.map(c=>c.site)}))
 }
}catch(e){console.log('FULL_MIX_FAILED',e instanceof Error?e.message:'Unknown error');process.exitCode=1}
