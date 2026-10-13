import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const response=await fetch('https://catalog.eridan.software/api/openapi.json',{signal:AbortSignal.timeout(15000)})
 assert.ok(response.ok)
 const schema=await response.json()
 const path=Object.keys(schema.paths).find(p=>/\/lots\/?$/.test(p))!
 assert.ok(path)
 console.log('CYLINDER_QUERY_FIELDS',JSON.stringify(schema.paths[path].get.parameters.map((p:{name:string})=>p.name).filter((name:string)=>/cylind/i.test(name))))
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 let requests=0
 const provider=createEridanProvider(async(path,params)=>{
  requests++
  assert.equal(params.has('cylinders'),false)
  return transport(path,params)
 })
 const started=Date.now()
 const result=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',cylinders:'6',size:'6'}))
 assert.ok(result.items.length>0,'No live six-cylinder BMW results')
 assert.ok(result.items.every(car=>car.cylinders===6),'Cylinder mismatch')
 assert.ok(result.items.some(car=>car.site===1),'Missing Copart results')
 assert.ok(result.items.some(car=>car.site===2),'Missing IAAI results')
 console.log('CYLINDER_CHECK',JSON.stringify({count:result.items.length,copart:result.items.filter(car=>car.site===1).length,iaai:result.items.filter(car=>car.site===2).length,hasNext:result.hasNext,requests,ms:Date.now()-started}))
}
main().catch(()=>{console.error('Cylinder contract check failed; inspect the API contract and bounded scan.');process.exitCode=1})
