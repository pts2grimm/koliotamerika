import assert from 'node:assert/strict'
import {createEridanProvider} from '../src/lib/auction-providers/eridan'
import {createEridanTransport} from '../src/lib/auction-providers/eridan-transport'
import {modelFamily} from '../src/lib/auction-providers/model-families'
async function main(){
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 let requests=0
 const provider=createEridanProvider(async(path,p)=>{
  requests++
  const result=await transport(path,p)
  if(path==='/lots'){
   assert.ok(p.has('model_ids'));assert.equal(p.has('model__name'),false)
   const ids=p.get('model_ids')!.split(',').map(Number)
   assert.ok((result as {items:{model:{id:number}}[]}).items.every(x=>ids.includes(x.model.id)))
  }
  return result
 })
 for(const [make,family] of [['BMW','3 SERIES'],['BMW','5 SERIES'],['MERCEDES-BENZ','C-CLASS'],['AUDI','A4'],['VOLKSWAGEN','GOLF'],['TOYOTA','CAMRY'],['PORSCHE','MACAN']]){
  const models=await provider.models!(make)
  assert.ok(models.includes(family))
  const start=Date.now(),before=requests
  const result=await provider.search(new URLSearchParams({make,model:family,site:'1,2'}))
  assert.ok(result.items.length>0);assert.ok(result.items.every(car=>modelFamily(make,car.model)===family))
  console.log('FAMILY_CHECK',JSON.stringify({make,family,choices:models.length,items:result.items.length,sites:[...new Set(result.items.map(c=>c.site))],variants:new Set(result.items.map(c=>c.model)).size,hasNext:result.hasNext,requests:requests-before,ms:Date.now()-start}))
 }
 console.log('FAMILY_CHECK_OK',{requests})
}
main().catch(e=>{const m=e instanceof Error?e.message:'';console.error('FAMILY_CHECK_FAILED',/^Auction provider HTTP \d{3}$/.test(m)?m:'request-or-contract');process.exitCode=1})
