import type { AuctionCar,AuctionProvider,AuctionTransport } from './types'
import { extractItems,extractTotal,normalizeCar,normalizeMakes,record,validSearchParams } from './normalize'
// Endpoint names and the api-key header are taken from the supplied KOA plugins.
export function createApiCarProvider(request:AuctionTransport,vinEnabled=false):AuctionProvider {
 const detail=async(lot:string,site:string):Promise<AuctionCar|undefined>=>{if(!/^\d{5,12}$/.test(lot)||!['1','2'].includes(site))throw new Error('Invalid lot');const raw=await request(`/cars/${lot}`,new URLSearchParams({site}));return normalizeCar(record(raw).data??raw,site)}
 return {name:'apicar',detail,
 async search(input){const params=validSearchParams(input);params.set('size',String(Math.max(10,Number(params.get('size')))));const sites=[...new Set((input.get('site')||'1').split(',').filter(s=>['1','2'].includes(s)))];if(!sites.length)sites.push('1');const size=Number(params.get('size')),page=Number(params.get('page'));const parts=await Promise.all(sites.map(async site=>{const p=new URLSearchParams(params);p.set('site',site);const raw=await request('/cars',p);const items=extractItems(raw).map(item=>normalizeCar(item,site)).filter((x):x is AuctionCar=>!!x);return {items,total:extractTotal(raw,items.length)}}));const unique=new Map<string,AuctionCar>();for(const part of parts)for(const car of part.items)unique.set(car.id,car);const items=[...unique.values()].sort((a,b)=>(a.auction_date||'').localeCompare(b.auction_date||''));return {success:true,items,total:parts.reduce((sum,p)=>sum+p.total,0),totalPages:Math.max(1,...parts.map(p=>Math.ceil(p.total/size))),size:size*sites.length,page}},
 async makes(){return normalizeMakes(await request('/cars/makes-and-models',new URLSearchParams()))},
 async lookup(q){if(/^[A-HJ-NPR-Z0-9]{17}$/i.test(q)){if(!vinEnabled)throw new Error('VIN lookup is not enabled for this API plan');const raw=await request('/cars/vin/all',new URLSearchParams({vin:q.toUpperCase()}));const candidates=extractItems(raw).map(item=>normalizeCar(item)).filter((x):x is AuctionCar=>!!x).sort((a,b)=>(b.auction_date||'').localeCompare(a.auction_date||''));if(candidates[0])return {lot:String(candidates[0].lot_id),site:String(candidates[0].site)};throw new Error('VIN not found')}
  if(!/^\d{5,12}$/.test(q))throw new Error('Invalid lot')
  for(const site of ['1','2']){try{const car=await detail(q,site);if(car)return {lot:String(car.lot_id),site:String(car.site)}}catch(e){if(!(e instanceof Error)||!e.message.includes('404'))throw e}}
  throw new Error('Lot not found')
 }
 }
}
