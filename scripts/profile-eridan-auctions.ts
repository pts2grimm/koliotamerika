import assert from 'node:assert/strict'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=performance.now();const response=await fetch(url,init)
 console.log('UPSTREAM',JSON.stringify({path:url.pathname,auction:url.searchParams.get('auction'),status:response.status,ms:Math.round(performance.now()-start)}));return response
}})
const provider=createEridanProvider(transport)
async function search(site:string,page='1'){
 const start=performance.now()
 const data=await provider.search(new URLSearchParams({site,size:'6',vehicle_type:'Automobile',page}))
 assert(data.items.length>0)
 assert(data.items.every(c=>c.link_img_hd?.length))
 console.log('LIVE_MIX',JSON.stringify({site,page,ms:Math.round(performance.now()-start),items:data.items.length,sites:data.items.map(c=>c.site),lots:data.items.map(c=>c.lot_id)}))
 return data.items
}
try{
 const first=await search('1,2')
 assert.equal(first.length,12)
 assert.deepEqual(first.map(c=>c.site),[1,2,1,2,1,2,1,2,1,2,1,2])
 const second=await search('1,2','2')
 assert.equal(new Set([...first,...second].map(c=>c.id)).size,first.length+second.length)
 const iaai=await search('2')
 assert(iaai.every(c=>c.site===2))
 console.log('LIVE_MIX_SUCCESS',JSON.stringify({calls}))
}catch(error){
 console.error('LIVE_MIX_FAILED',error instanceof assert.AssertionError?error.message:'Provider request failed; credentials and response withheld')
 process.exitCode=1
}
