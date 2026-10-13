import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 let calls=0
 const originals=new Map<string,Record<string,any>>()
 const provider=createEridanProvider(async(path,params)=>{
  calls++
  const data=await transport(path,params)
  if(path==='/lots')for(const row of (data as {items:Record<string,any>[]}).items) originals.set((row.auction==='copart'?1:2)+':'+row.lot_number,row)
  return data
 })
 for(const [sort,field,dir] of [['auction_soon','sale_date',1],['auction_late','sale_date',-1],['newest','created_at',-1],['year_desc','year',-1],['year_asc','year',1]] as const){
  const start=Date.now(),before=calls
  const results=[]
  for(const page of ['1','2']){
   const data=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',sort,page}))
   results.push(...data.items)
  }
  assert.ok(results.length>12)
  assert.equal(new Set(results.map(r=>r.id)).size,results.length)
  const raw=results.map(r=>originals.get(r.id)!)
  for(let i=1;i<raw.length;i++){
   const a=raw[i-1][field],b=raw[i][field]
   if(b==null)continue
   assert.notEqual(a,null)
   const cmp=a===b?raw[i-1].id-raw[i].id:a<b?-1:1
   assert.ok(cmp*dir<=0,'Global ordering mismatch')
  }
  console.log('SORT_ADAPTER_OK',JSON.stringify({sort,items:results.length,sites:[...new Set(results.map(r=>r.site))],requests:calls-before,ms:Date.now()-start}))
 }
 for(const [make,type] of [['BMW','Motorcycle'],['HONDA','Automobile'],['HONDA','Motorcycle'],['HONDA','ATVUTV']]){
  originals.clear()
  const before=calls,started=Date.now()
  const models=await provider.models!(make,type)
  assert.ok(models.length>0)
  if(type==='Motorcycle')assert.ok(!models.some(m=>['CIVIC','ACCORD','3 SERIES','X5'].includes(m)))
  if(make==='HONDA'&&type==='Automobile')assert.ok(models.includes('CIVIC')&&!models.includes('CBR600RR'))
  console.log('CATEGORY_MODELS_OK',JSON.stringify({make,type,models:models.length,requests:calls-before,ms:Date.now()-started}))
 }
 console.log('SORT_AND_CATEGORY_CHECK_OK',{requests:calls})
}
main().catch(error=>{
 const message=error instanceof Error?error.message:''
 console.error('SORT_AND_CATEGORY_FAILED',/^Auction provider HTTP \d{3}$/.test(message)?message:message.includes('limit')?'bounded-directory-limit':'request-or-contract')
 process.exitCode=1
})
