import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
let calls=0
const provider=createEridanProvider(async(path,params)=>{
 calls++
 const started=Date.now()
 const raw=await transport(path,params)
 if(path==='/lots'){
 const data=raw as {items?:{seller?:string}[];has_next?:boolean;page_size?:number}
 console.log('SELLER_PAGE',JSON.stringify({auction:params.get('auction'),undated:params.get('sale_date__isnull')==='true',page:params.get('page'),size:data.page_size,items:data.items?.length,named:data.items?.filter(x=>x.seller?.trim()).length,hasNext:data.has_next,ms:Date.now()-started}))
 }
 return raw
})
const seen=new Set<string>()
for(const page of ['1','2']){
 const before=calls,start=Date.now()
 const result=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',seller_type:'insurance',size:'12',page}))
 assert.ok(result.items.length>0)
 assert.ok(result.items.every(c=>c.seller_type==='insurance'&&Boolean(c.seller)))
 assert.ok(result.items.every(c=>!seen.has(c.id)))
 result.items.forEach(c=>seen.add(c.id))
 console.log('BMW_INSURANCE_OK',JSON.stringify({page,items:result.items.length,sites:[...new Set(result.items.map(c=>c.site))],hasNext:result.hasNext,requests:calls-before,ms:Date.now()-start}))
}
const privateCars=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',seller_type:'dealer',size:'12'}))
assert.ok(privateCars.items.length>0&&privateCars.items.every(c=>!c.seller))
console.log('PRIVATE_OK',JSON.stringify({items:privateCars.items.length}))
