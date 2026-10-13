import assert from 'node:assert/strict'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {auctionSchedule,parseAuctionDate} from '../src/lib/auction-schedule'
const reason=(e:unknown)=>{const m=e instanceof Error?e.message:'';return /^(Auction provider HTTP [0-9]{3}|Eridan request timed out|Unsupported Eridan operation)$/.test(m)?m:'request-or-contract'}
async function main(){
 assert.ok(process.env.ERIDAN_API_KEY)
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const fields=(row:Record<string,unknown>)=>({id:row.id,lot_number:row.lot_number,auction:row.auction,name:row.name,status:row.status,sale_date:row.sale_date,is_future_sale:row.is_future_sale,auction_last_update:row.auction_last_update,updated_at:row.updated_at,date_parsed:row.date_parsed})
 console.log('CHECKED_AT',new Date().toISOString())
 for(const lot of ['57397516','64492136']){
  const ids=new Set<number>()
  for(const extra of [{},{status:'active'},{sale_date__gte:new Date().toISOString()}]){
   const params=new URLSearchParams({lot_number:lot,auction:'copart',ordering:'-updated_at',page:'1',page_size:'10',...extra})
   const started=Date.now()
   try{
    const result=await request('/lots',params) as {items:Record<string,unknown>[],has_next:boolean}
    assert.ok(Array.isArray(result.items))
    console.log('FRESH_LIST',JSON.stringify({lot,params:Object.fromEntries(params),elapsedMs:Date.now()-started,hasNext:result.has_next,items:result.items.map(fields)}))
    for(const row of result.items)if(Number.isSafeInteger(row.id))ids.add(Number(row.id))
   }catch(e){console.log('LIST_ERROR',{lot,reason:reason(e),elapsedMs:Date.now()-started})}
  }
  assert.ok(ids.size<=10)
  for(const id of ids){
   const started=Date.now()
   // The application only calls /lots; this documented detail endpoint is checked independently.
   const response=await fetch('https://catalog.eridan.software/api/lots/'+id,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/json',Authorization:'Bearer '+process.env.ERIDAN_API_KEY!.trim()}})
   console.log('DETAIL_HTTP',{lot,id,status:response.status,elapsedMs:Date.now()-started})
   if(response.ok){const result=await response.json();console.log('FRESH_DETAIL',JSON.stringify(fields(result)))}else await response.body?.cancel()
  }
  try{
   const car=await createEridanProvider(request).detail(lot,'1')
   console.log('CURRENT_ADAPTER',JSON.stringify({lot,found:Boolean(car),date:car?.auction_date,status:car?.auction_status,schedule:auctionSchedule(parseAuctionDate(car?.auction_date),Date.now(),car?.auction_status)}))
  }catch(e){console.log('ADAPTER_ERROR',{lot,reason:reason(e)})}
  try{
   const site=await fetch('https://darkturquoise-duck-750266.hostingersite.com/targove/kola?lot='+lot+'&site=1',{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}})
   const html=await site.text()
   console.log('CURRENT_STAGING',JSON.stringify({lot,status:site.status,url:site.url,length:html.length,title:html.match(/<title>(.*?)<\/title>/s)?.[1],h1:html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1],headers:Object.fromEntries(['age','cache-control','x-nextjs-cache'].map(key=>[key,site.headers.get(key)])),awaitingCurrentDate:html.includes('Очаква се актуална дата'),previousDateLabel:html.includes('Предишна дата от доставчика'),pastLabel:html.includes('Посоченият час е минал'),originalLink:html.includes('https://www.copart.com/lot/'+lot),timeTags:html.match(/<time[^>]*>[^<]*<\/time>/g)?.slice(0,3),missingCar:html.includes('Автомобилът не е достъпен.')}))
  }catch(e){console.log('STAGING_ERROR',{lot,reason:reason(e)})}
 }
}
main().catch(error=>{console.error('CHECK_FAILED',reason(error));process.exitCode=1})
