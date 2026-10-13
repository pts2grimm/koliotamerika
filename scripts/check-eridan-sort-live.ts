import assert from 'node:assert/strict'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const schema=await (await fetch('https://catalog.eridan.software/api/openapi.json')).json()
 const path=Object.keys(schema.paths).find(p=>/\/lots\/?$/.test(p))!
 const op=schema.paths[path]
 const parameters=[...(op.parameters||[]),...(op.get?.parameters||[])].map(p=>p.$ref?p.$ref.slice(2).split('/').reduce((v,k)=>v?.[k],schema):p)
 console.log('SORT_SCHEMA',JSON.stringify(parameters.find(p=>p.name==='ordering')))
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 for(const ordering of ['sale_date,id','-sale_date,-id','-created_at,-id','-year,-id','year,id']){
  for(const auction of ['copart','iaai']){
   const response=await request('/lots',new URLSearchParams({auction,make__name:'BMW',status:'active',sale_date__gte:new Date().toISOString(),has_images:'true',page_size:'30',ordering})) as {items:Record<string,any>[]}
   const fields=ordering.split(',')
   const values=response.items.map(row=>fields.map(f=>row[f.replace(/^-/,'')]))
   const compare=(a:any[],b:any[])=>{for(let i=0;i<fields.length;i++){if(a[i]===b[i])continue;if(a[i]==null||b[i]==null)return 0;const d=a[i]<b[i]?-1:1;return fields[i].startsWith('-')?-d:d}return 0}
   console.log('SORT_PROBE',JSON.stringify({ordering,auction,items:values.length,missing:values.filter(r=>r.some(v=>v==null)).length,monotonic:values.every((v,i)=>!i||compare(values[i-1],v)<=0)}))
  }
 }
}
main().catch(()=>{console.error('SORT_CHECK_FAILED: request or contract');process.exitCode=1})
