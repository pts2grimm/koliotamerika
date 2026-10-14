import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { catalogueSort } from '../src/lib/auction-sorting'
async function main(){
 const transport=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 let calls=0
 const provider=createEridanProvider(async(path,params)=>{calls++;return transport(path,params)})
 const results=[]
 for(const page of ['1','2']){
  const data=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',sort:catalogueSort(undefined),page}))
  results.push(...data.items)
 }
 assert.ok(results.length>12)
 assert.equal(new Set(results.map(car=>car.id)).size,results.length)
 const dates=results.map(car=>car.auction_date?Date.parse(car.auction_date):Infinity)
 assert.ok(dates.every((date,index)=>!index||date>=dates[index-1]))
 console.log('LIVE_DEFAULT_SORT',JSON.stringify({items:results.length,sites:[...new Set(results.map(car=>car.site))],calls}))
 const six=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',cylinders:'6',sort:catalogueSort(undefined)}))
 assert.ok(six.items.length>0&&six.items.every(car=>car.cylinders===6))
 console.log('LIVE_CYLINDERS',JSON.stringify({items:six.items.length,sites:[...new Set(six.items.map(car=>car.site))]}))
 const bikes=await provider.search(new URLSearchParams({vehicle_type:'Powersports',site:'1,2',size:'6',sort:catalogueSort(undefined)}))
 assert.ok(bikes.items.length>0&&bikes.items.every(car=>['Motorcycle','ATVUTV'].includes(car.vehicle_type!)))
 console.log('LIVE_POWERSPORTS',JSON.stringify({items:bikes.items.length,sites:[...new Set(bikes.items.map(car=>car.site))],calls}))
}
main().catch(()=>{console.error('Live release check failed; no upstream payload or credentials logged.');process.exitCode=1})
