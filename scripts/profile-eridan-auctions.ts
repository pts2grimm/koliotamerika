import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
let calls=0
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
 calls++;const start=performance.now()
 const response=await fetch(url,init)
 console.log('UPSTREAM',JSON.stringify({path:url.pathname,auction:url.searchParams.get('auction'),type:url.searchParams.get('item_type'),status:response.status,ms:Math.round(performance.now()-start)}))
 return response
}})
const provider=createEridanProvider(transport)
for(const site of ['1,2','2','1']){
 const start=performance.now()
 try{
  const data=await provider.search(new URLSearchParams({site,size:'12'}))
  console.log('AUCTION_RESULTS',JSON.stringify({site,ms:Math.round(performance.now()-start),items:data.items.length,hasNext:data.hasNext,distribution:data.items.reduce((a,c)=>{a[c.site]=(a[c.site]||0)+1;return a},{} as Record<number,number>),first:data.items.slice(0,3).map(c=>({lot:c.lot_id,site:c.site,make:c.make,images:c.link_img_hd?.length,hosts:[...new Set((c.link_img_hd||[]).map(u=>new URL(u).hostname))]}))}))
 }catch{console.log('AUCTION_RESULTS_FAILED',site)}
}
console.log('CALLS',calls)
