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

}
main().catch(()=>{console.error('CATEGORY_CHECK_FAILED');process.exitCode=1})
