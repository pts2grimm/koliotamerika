import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { isAuctionClosed } from '../src/lib/auction-lifecycle'
async function main(){
 let calls=0
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const provider=createEridanProvider(async(path,p)=>{
  calls++
  if(path==='/lots') assert.ok(p.has('sale_date__gte')||p.get('sale_date__isnull')==='true')
  return transport(path,p)
 })
 for(const extra of [{},{seller_type:'insurance'},{seller_type:'dealer'},{status:'Run & Drive',model:'3 SERIES'}]){
  const before=calls,started=Date.now()
  const result=await provider.search(new URLSearchParams({make:'BMW',site:'1,2',size:'12',...extra}))
  assert.ok(result.items.length>0)
  assert.ok(result.items.every(c=>c.auction_status==='active'&&!isAuctionClosed(c)))
  if(extra.seller_type)assert.ok(result.items.every(c=>c.seller_type===extra.seller_type&&(extra.seller_type==='insurance'?Boolean(c.seller):!c.seller)))
  if(extra.status)assert.ok(result.items.every(c=>c.status===extra.status))
  console.log('BMW_FILTER_CHECK',JSON.stringify({filter:extra.seller_type||extra.status||'make-only',items:result.items.length,sites:[...new Set(result.items.map(c=>c.site))],hasNext:result.hasNext,requests:calls-before,ms:Date.now()-started}))
 }
 console.log('SELLER_CHECK_OK',{requests:calls})
}
main().catch(e=>{const msg=e instanceof Error?e.message:'';console.error('SELLER_CHECK_FAILED',/^Auction provider HTTP \d{3}$/.test(msg)?msg:'request-or-contract');process.exitCode=1})
