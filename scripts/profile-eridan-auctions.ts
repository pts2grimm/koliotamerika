import {createEridanProvider,normalizeEridanCar} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=performance.now();const response=await fetch(url,init)
 console.log('UPSTREAM',JSON.stringify({path:url.pathname,auction:url.searchParams.get('auction'),type:url.searchParams.get('item_type'),page:url.searchParams.get('page'),size:url.searchParams.get('page_size'),status:response.status,ms:Math.round(performance.now()-start)}))
 if(response.ok){const data:any=await response.clone().json();if(Array.isArray(data.items))console.log('ROWS',JSON.stringify({count:data.items.length,hasNext:data.has_next,invalid:data.items.filter((r:any)=>!normalizeEridanCar(r)).map((r:any)=>({id:r.id,lot:r.lot_number,auction:r.auction})),types:[...new Set(data.items.map((r:any)=>r.item_type))]}))}
 return response
}})
try{
 const started=performance.now()
 const data=await createEridanProvider(transport).search(new URLSearchParams({site:'1,2',size:'12'}))
 console.log('FULL_SEARCH',JSON.stringify({ms:Math.round(performance.now()-started),count:data.items.length,sites:data.items.map(c=>c.site),calls}))
}catch(e){console.log('FULL_SEARCH_FAILED',e instanceof Error?e.message:'Unknown error')}
