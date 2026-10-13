import assert from 'node:assert/strict'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const schema=await (await fetch('https://catalog.eridan.software/api/openapi.json')).json()
 const path=Object.keys(schema.paths).find(p=>/\/lots\/?$/.test(p))!
 const op=schema.paths[path]
 const parameters=[...(op.parameters||[]),...(op.get?.parameters||[])].map(p=>p.$ref?p.$ref.slice(2).split('/').reduce((v,k)=>v?.[k],schema):p)
 console.log('SORT_SCHEMA',JSON.stringify(parameters.find(p=>p.name==='ordering')))
 for(const suffix of ['/makes','/models']){
  const path=Object.keys(schema.paths).find(p=>p.replace(/\/$/,'').endsWith(suffix))!
  const op=schema.paths[path]
  const pars=[...(op.parameters||[]),...(op.get?.parameters||[])].map(p=>p.$ref?p.$ref.slice(2).split('/').reduce((v,k)=>v?.[k],schema):p)
  console.log('CATEGORY_SCHEMA',JSON.stringify({path,parameters:pars}))
 }
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 for(const [make,item_type] of [['BMW','VEHTYPE_V'],['BMW','VEHTYPE_M'],['HONDA','VEHTYPE_V'],['HONDA','VEHTYPE_M'],['HONDA','VEHTYPE_A']]){
  for(const scope of ['upcoming','undated']){
   const params=new URLSearchParams({make__name:make,item_type,status:'active',has_images:'true',page_size:'1000',ordering:'id',...(scope==='upcoming'?{sale_date__gte:new Date().toISOString()}:{sale_date__isnull:'true'})})
   const started=Date.now(), data=await request('/lots',params) as {items:Record<string,any>[];has_next:boolean;page_size:number}
   console.log('CATEGORY_PAGE',JSON.stringify({make,item_type,scope,items:data.items.length,pageSize:data.page_size,hasNext:data.has_next,models:new Set(data.items.map(r=>r.model?.id)).size,wrongType:data.items.some(r=>r.item_type!==item_type),ms:Date.now()-started}))
  }
 }
}
main().catch(()=>{console.error('CATEGORY_CHECK_FAILED');process.exitCode=1})
