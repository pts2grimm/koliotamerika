import assert from 'node:assert/strict'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const d=await request('/models',new URLSearchParams({make__name:'BMW',page:'1',page_size:'1000'})) as {items:{id:number,name:string}[]}
 const names=['328','330','328I','330I'],ids=d.items.filter(x=>names.includes(x.name)).map(x=>x.id)
 assert.equal(ids.length,4)
 for(const auction of ['copart','iaai'])for(const mode of ['model_ids','models']){
  const p=new URLSearchParams({make__name:'BMW',auction,status:'active',has_images:'true',sale_date__gte:new Date().toISOString(),page:'1',page_size:'100',ordering:'-id'})
  p.set(mode,mode==='model_ids'?ids.join(','):names.join(','))
  const r=await request('/lots',p) as {items:any[],has_next:boolean}
  assert.ok(r.items.length>0)
  assert.ok(r.items.every(x=>names.includes(x.model.name)))
  console.log('MODEL_UNION',JSON.stringify({auction,mode,items:r.items.length,hasNext:r.has_next,models:[...new Set(r.items.map(x=>x.model.name))]}))
 }
}
main().catch(e=>{const m=e instanceof Error?e.message:'';console.error('TAXONOMY_FAILED',/^Auction provider HTTP \d{3}$/.test(m)?m:'contract');process.exitCode=1})
