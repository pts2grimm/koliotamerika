import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalEridanMake, eridanMakeAliases, eridanMakeParams, sameEridanMake } from '../src/lib/auction-providers/make-aliases'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import type { AuctionTransport } from '../src/lib/auction-providers/types'

test('only confirmed spelling aliases share a canonical make', () => {
 for (const [input, expected] of [['MERCEDES','MERCEDES-BENZ'],[' mercedes benz ','MERCEDES-BENZ'],['ROLLS ROYCE','ROLLS-ROYCE'],['HARLEY','HARLEY-DAVIDSON'],['CAN AM','CAN-AM'],['CF MOTO','CFMOTO'],['ARCTICCAT','ARCTIC CAT'],['GAS GAS','GASGAS'],['TAOTAO','TAO TAO']]) assert.equal(canonicalEridanMake(input),expected)
 for (const [a,b] of [['DODGE','RAM'],['ROVER','LAND ROVER'],['MERCEDES','MAYBACH'],['BOMBARDIER','CAN-AM']]) assert.equal(sameEridanMake(a,b),false)
 assert.equal(canonicalEridanMake('Ford'),'Ford')
 assert.deepEqual(eridanMakeParams('Ford'),{make__name:'Ford'})
 assert.deepEqual(eridanMakeParams('MERCEDES'),{makes:'MERCEDES-BENZ,MERCEDES BENZ,MERCEDES'})
})
const aliases=eridanMakeAliases('MERCEDES')
const makeRows=[...aliases,'ROLLS ROYCE','ROLLS-ROYCE','Ford','DODGE','RAM','CF MOTO','CFMOTO'].map((name,i)=>({id:i+1,name}))
const models=aliases.map((_,i)=>({id:100+i,name:['C300','AMG C 43','C-CLASS C300'][i]}))
const rows=Array.from({length:36},(_,i)=>({
 id:1000+i, lot_number:String(97000000+i), auction:i%2?'iaai':'copart',
 make:{id:i%3+1,name:aliases[i%3]}, model:models[i%3], year:2023, name:'2023 Mercedes',
 status:'active', item_type:'VEHTYPE_V', sale_date:'2030-10-12T14:00:00Z',
 images:['https://cs.copart.com/test.jpg'], currency:'USD',
}))
function fixture(failAlias='') {
 const calls:{path:string;params:URLSearchParams}[]=[]
 const request:AuctionTransport=async(path,p)=>{
  calls.push({path,params:new URLSearchParams(p)})
  if(path==='/makes')return {items:makeRows,count:makeRows.length}
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  if(path==='/models'){
   if(p.get('make__name')===failAlias)throw new Error('Directory unavailable')
   const i=aliases.indexOf(p.get('make__name')||'')
   const items=i<0?[]:[models[i]]
   return {items,count:items.length}
  }
  assert.equal(path,'/lots')
  const items=rows.filter(row=>
   (!p.get('make__name')||p.get('make__name')===row.make.name)&&
   (!p.get('makes')||p.get('makes')!.split(',').includes(row.make.name))&&
   (!p.get('auction')||p.get('auction')===row.auction)&&
   (!p.get('item_type')||p.get('item_type')===row.item_type)&&
   (!p.get('model_ids')||p.get('model_ids')!.split(',').includes(String(row.model.id)))&&
   (!p.get('model__name')||p.get('model__name')===row.model.name)&&
   p.get('sale_date__isnull')!=='true'
  ).sort((a,b)=>p.get('ordering')==='id'?a.id-b.id:b.id-a.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return {items:items.slice((page-1)*size,page*size),page,page_size:size,has_next:page*size<items.length}
 }
 return {provider:createEridanProvider(request),calls}
}
test('make dropdown deduplicates aliases but keeps distinct brands', async()=>{
 const {provider}=fixture()
 assert.deepEqual(Object.keys(await provider.makes()),['MERCEDES-BENZ','ROLLS-ROYCE','Ford','DODGE','RAM','CFMOTO'])
})
test('model families union every alias directory and never cache a partial failure',async()=>{
 const {provider,calls}=fixture()
 assert.deepEqual(await provider.models!('MERCEDES'),['C-CLASS'])
 assert.deepEqual(await provider.models!('MERCEDES BENZ'),['C-CLASS'])
 assert.equal(calls.filter(c=>c.path==='/models').length,3)
 const broken=fixture('MERCEDES BENZ')
 await assert.rejects(()=>broken.provider.models!('MERCEDES'),/Directory unavailable/)
 await assert.rejects(()=>broken.provider.models!('MERCEDES'),/Directory unavailable/)
 assert.equal(broken.calls.filter(c=>c.path==='/models').length,6)
})
test('category-scoped model discovery includes all aliases and keeps category/date constraints',async()=>{
 const {provider,calls}=fixture()
 assert.deepEqual(await provider.models!('MERCEDES BENZ','Automobile'),['C-CLASS'])
 const requests=calls.filter(c=>c.path==='/lots')
 assert.equal(requests.length,2)
 for(const {params} of requests){
  assert.equal(params.get('makes'),aliases.join(','))
  assert.equal(params.has('make__name'),false)
  assert.equal(params.get('item_type'),'VEHTYPE_V')
  assert.equal(params.get('status'),'active')
 }
})
test('canonical and old alias searches include both auctions and all models before pagination',async()=>{
 for(const make of aliases){
  const {provider,calls}=fixture()
  const filters={make,model:'C-CLASS',vehicle_type:'Automobile',site:'1,2',size:'12'}
  const first=await provider.search(new URLSearchParams({...filters,page:'1'}))
  const second=await provider.search(new URLSearchParams({...filters,page:'2'}))
  assert.equal(first.items.length,24);assert.equal(first.hasNext,true)
  assert.equal(second.items.length,12);assert.equal(second.hasNext,false)
  assert.equal(new Set([...first.items,...second.items].map(car=>car.id)).size,36)
  assert.deepEqual(new Set(first.items.map(car=>car.make)),new Set(aliases))
  assert.deepEqual(new Set(first.items.map(car=>car.site)),new Set([1,2]))
  for(const {params} of calls.filter(c=>c.path==='/lots')){
   assert.equal(params.has('make__name'),false)
   assert.equal(params.get('makes'),aliases.join(','))
   assert.equal(params.get('model_ids'),'100,101,102')
   assert.equal(params.has('model__name'),false)
  }
 }
})
test('make-only and specific-model legacy URLs remain usable across aliases',async()=>{
 const {provider}=fixture()
 const all=await provider.search(new URLSearchParams({make:'MERCEDES',vehicle_type:'Automobile',site:'1,2'}))
 assert.equal(all.items.length,24)
 const specific=await provider.search(new URLSearchParams({make:'MERCEDES BENZ',model:'AMG C 43',vehicle_type:'Automobile',site:'1,2'}))
 assert.equal(specific.items.length,12)
 assert.ok(specific.items.every(car=>car.model==='AMG C 43'))
})
