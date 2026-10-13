import assert from 'node:assert/strict'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {auctionSchedule,parseAuctionDate} from '../src/lib/auction-schedule'
async function main(){
 assert.ok(process.env.ERIDAN_API_KEY)
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const fields=(row:Record<string,unknown>)=>({id:row.id,lot_number:row.lot_number,auction:row.auction,status:row.status,sale_date:row.sale_date,is_future_sale:row.is_future_sale,auction_last_update:row.auction_last_update,updated_at:row.updated_at,date_parsed:row.date_parsed})
 console.log('CHECKED_AT',new Date().toISOString())
 const ids=new Set<number>()
 for(const extra of [{auction:'copart'},{auction:'copart',status:'active'},{},{auction:'copart',sale_date__gte:new Date().toISOString()}]){
  const params=new URLSearchParams({lot_number:'57397516',ordering:'-sale_date',page:'1',page_size:'100',...extra})
  const result=await request('/lots',params) as {items:Record<string,unknown>[],has_next:boolean}
  assert.ok(Array.isArray(result.items))
  console.log('FRESH_LIST',JSON.stringify({params:Object.fromEntries(params),hasNext:result.has_next,items:result.items.map(fields)}))
  for(const row of result.items)if(Number.isSafeInteger(row.id))ids.add(Number(row.id))
 }
 assert.ok(ids.size<=10,'Unexpectedly large exact lot history')
 for(const id of ids){
  const result=await request('/lots/'+id,new URLSearchParams()) as Record<string,unknown>
  console.log('FRESH_DETAIL',JSON.stringify(fields(result)))
 }
 const car=await createEridanProvider(request).detail('57397516','1')
 console.log('CURRENT_ADAPTER',JSON.stringify({found:Boolean(car),date:car?.auction_date,status:car?.auction_status,schedule:auctionSchedule(parseAuctionDate(car?.auction_date),Date.now(),car?.auction_status)}))
 const site=await fetch('https://darkturquoise-duck-750266.hostingersite.com/targove/kola?lot=57397516&site=1',{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}})
 const html=await site.text()
 console.log('CURRENT_STAGING',JSON.stringify({status:site.status,url:site.url,headers:Object.fromEntries(['age','cache-control','x-nextjs-cache'].map(key=>[key,site.headers.get(key)])),awaitingCurrentDate:html.includes('Очаква се актуална дата'),previousDateLabel:html.includes('Предишна дата от доставчика'),pastLabel:html.includes('Посоченият час е минал'),originalLink:html.includes('https://www.copart.com/lot/57397516'),timeTags:html.match(/<time[^>]*>[^<]*<\/time>/g)?.slice(0,3)}))
}
main().catch(error=>{const message=error instanceof Error?error.message:'';console.error('CHECK_FAILED',/^Auction provider HTTP [0-9]{3}$/.test(message)?message:'request-or-contract');process.exitCode=1})
