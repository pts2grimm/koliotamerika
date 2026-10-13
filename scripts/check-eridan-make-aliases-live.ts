import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { canonicalEridanMake, eridanMakeAliases } from '../src/lib/auction-providers/make-aliases'
if(!process.env.ERIDAN_API_KEY)throw new Error('ERIDAN_API_KEY is missing')
const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:(url,init)=>fetch(url,init)})
const provider=createEridanProvider(request)
let stage='makes'
try{
 const makes=Object.keys(await provider.makes())
 for(const canonical of ['MERCEDES-BENZ','ROLLS-ROYCE']){
  assert.ok(makes.includes(canonical))
  assert.deepEqual(makes.filter(make=>canonicalEridanMake(make)===canonical),[canonical])
  stage=canonical+' models'
  const models=await provider.models!(canonical)
  assert.ok(models.length)
  console.log('LIVE_MERGED_MAKE',{make:canonical,modelFamilies:models.length})
  for(const alias of eridanMakeAliases(canonical)){
   stage=canonical+' alias search'
   const result=await provider.search(new URLSearchParams({make:alias,site:'1,2',vehicle_type:'Automobile',size:'12'}))
   assert.ok(result.items.every(car=>canonicalEridanMake(car.make)===canonical))
   console.log('LIVE_ALIAS_SEARCH',{make:alias,items:result.items.length,hasNext:result.hasNext,auctions:[...new Set(result.items.map(car=>car.site))]})
  }
 }
 stage='category models'
 const models=await provider.models!('MERCEDES','Automobile')
 assert.ok(models.includes('C-CLASS'))
 const result=await provider.search(new URLSearchParams({make:'MERCEDES-BENZ',model:'C-CLASS',site:'1,2',vehicle_type:'Automobile',size:'12'}))
 assert.ok(result.items.length)
 assert.ok(result.items.every(car=>canonicalEridanMake(car.make)==='MERCEDES-BENZ'))
 console.log('LIVE_CATEGORY_AND_FAMILY',{models:models.length,items:result.items.length,hasNext:result.hasNext})
 console.log('LIVE_MAKE_ALIASES_OK')
}catch{
 console.error('LIVE_MAKE_ALIASES_FAILED',{stage})
 process.exitCode=1
}
