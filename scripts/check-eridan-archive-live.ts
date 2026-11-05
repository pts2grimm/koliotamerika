import assert from 'node:assert/strict'
import { canonicalEridanSearch } from '../src/lib/auction-cache-key'
import { createEridanProvider, EridanSearchLimitError } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'

async function main(){
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 let requests=0,lotRequests=0
 const firstQueries=new Map<string,URLSearchParams>()
 const provider=createEridanProvider(async(path,params)=>{
  if(++requests>40)throw new Error('Probe request budget exceeded')
  if(path==='/lots')lotRequests++
  const start=Date.now()
  const result=await transport(path,params)
  if(path==='/lots'){
   const data=result as {items:{sale_date?:string}[];has_next:boolean}
   if(!firstQueries.has(params.get('auction')!))firstQueries.set(params.get('auction')!,new URLSearchParams(params))
   console.log('ARCHIVE_REQUEST',JSON.stringify({auction:params.get('auction'),page:params.get('page'),ordering:params.get('ordering'),items:data.items.length,hasNext:data.has_next,ms:Date.now()-start}))
  }
  return result
 })
 const ids=new Set<string>()
 let previous=Infinity
 for(const page of ['1','2']){
  const before=lotRequests,start=Date.now()
  const result=await provider.search(new URLSearchParams(canonicalEridanSearch('archive=ended&vehicle_type=Automobile&site=1,2&size=12&page='+page)))
  assert.equal(result.items.length,24,'Unfiltered archive must fill the page')
  for(const car of result.items){
   assert.ok(!ids.has(car.id),'Archive pages must not repeat lots')
   ids.add(car.id)
   const date=Date.parse(car.auction_date || '')
   assert.ok(Number.isFinite(date)&&date<=Date.now()&&date<=previous,'Latest ended ordering')
   previous=date
  }
  console.log('ARCHIVE_DEFAULT_OK',JSON.stringify({page,items:result.items.length,sites:[...new Set(result.items.map(c=>c.site))],lotRequests:lotRequests-before,ms:Date.now()-start}))
 }
 for(const [auction,query] of firstQueries){
  const cutoff=new Date(Date.now()-7*86400000).toISOString()
  query.set('sale_date__gte',cutoff)
  const start=Date.now()
  const data=await transport('/lots',query) as {items:{sale_date:string}[];has_next:boolean}
  assert.ok(data.items.every(row=>Date.parse(row.sale_date)>=Date.parse(cutoff)),'Recent date boundary must be honored')
  console.log('ARCHIVE_RECENT_PROBE',JSON.stringify({auction,items:data.items.length,hasNext:data.has_next,ms:Date.now()-start}))
 }
 // Compare the previous public default using the same bounded adapter.
 const start=Date.now(),before=lotRequests
 try{
  const result=await provider.search(new URLSearchParams(canonicalEridanSearch('archive=ended&vehicle_type=Automobile&site=1,2&size=12&sort=auction_soon')))
  console.log('ARCHIVE_OLDEST_BASELINE',JSON.stringify({items:result.items.length,lotRequests:lotRequests-before,ms:Date.now()-start}))
 }catch(error){
  if(!(error instanceof EridanSearchLimitError))throw error
  console.log('ARCHIVE_OLDEST_BASELINE',JSON.stringify({scanLimited:true,lotRequests:lotRequests-before,ms:Date.now()-start}))
 }
}
main().catch(error=>{
 const message=error instanceof Error?error.message:''
 console.error('ARCHIVE_CHECK_FAILED',/^Auction provider HTTP \d{3}$/.test(message)?message:message.includes('limit')?'bounded-scan-limit':'request-or-contract')
 process.exitCode=1
})
