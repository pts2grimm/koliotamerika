import { createEridanProvider, normalizeEridanCar } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { isEridanRoadMake, isEridanRoadModel } from '../src/lib/auction-providers/eridan-scope'
import { isAuctionClosed } from '../src/lib/auction-lifecycle'
// Diagnostics print aggregate counts and model-directory labels only.
// Never log vehicle rows, VINs, lot numbers, prices, sellers, media or credentials.
async function main() {
 let calls=0
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch:async(url,init)=>{
  if(++calls>28)throw new Error('Diagnostic request budget')
  return fetch(url,init)
 }})
 const provider=createEridanProvider(request)
 const exact=new URLSearchParams({make:'BMW',model:'3 SERIES',site:'1,2',status:'Run & Drive',page:'1',size:'12'})
 const result=await provider.search(exact)
 console.log('ADAPTER_COUNTS',JSON.stringify({checkedAt:new Date().toISOString(),count:result.items.length,hasNext:result.hasNext,sites:result.items.reduce((out,c)=>{out[String(c.site)]=(out[String(c.site)]||0)+1;return out},{} as Record<string,number>)}))
 for(const auction of ['copart','iaai']){
  const counts={rows:0,runDriveHighlights:0,normalizedRunDrive:0,expiredRunDrive:0,undatedRunDrive:0,futureRunDrive:0,eligibleUnique:0,wrongLifecycle:0}
  const unique=new Set<string>(), highlights:Record<string,number>={}
  let complete=false,pages=0
  for(let page=1;page<=8;page++){
   const data=await request('/lots',new URLSearchParams({make__name:'BMW',model__name:'3 SERIES',auction,item_type:'VEHTYPE_V',status:'active',has_images:'true',ordering:'-id',page:String(page),page_size:'100'})) as {items:Record<string,unknown>[],has_next:boolean}
   pages++
   for(const row of data.items){
    counts.rows++
    if(row.status!=='active')counts.wrongLifecycle++
    const hs=Array.isArray(row.highlights)?row.highlights.filter((h):h is string=>typeof h==='string'):[]
    for(const h of hs)if(/runs?|driv|start|stationary|enhanced/i.test(h))highlights[h]=(highlights[h]||0)+1
    if(hs.some(h=>/^runs?\s*(?:&|and)\s*drives?$/i.test(h.trim())))counts.runDriveHighlights++
    const car=normalizeEridanCar(row)
    if(car?.status!=='Run & Drive')continue
    counts.normalizedRunDrive++
    if(isAuctionClosed(car))counts.expiredRunDrive++
    else if(!car.auction_date)counts.undatedRunDrive++
    else counts.futureRunDrive++
    if(car.auction_status==='active'&&!isAuctionClosed(car)&&isEridanRoadMake(car.make,'Automobile')&&isEridanRoadModel(car.model,car.make)&&car.link_img_hd?.length)unique.add(car.id)
   }
   if(!data.has_next){complete=true;break}
  }
  counts.eligibleUnique=unique.size
  console.log('EXACT_MODEL_COUNTS',JSON.stringify({auction,pages,complete,counts,conditionLabels:highlights}))
 }
 const models=await provider.models!('BMW')
 console.log('BMW_DIRECTORY_LABELS',JSON.stringify({count:models.length,threeSeriesRelated:models.filter(n=>/^3|^M3(?:$|[^0-9])/i.test(n)).slice(0,80)}))
 console.log('DIAGNOSTIC_REQUEST_COUNT',calls)
}
main().catch(error=>{
 const msg=error instanceof Error?error.message:''
 console.log('COUNT_CHECK_FAILED',/^Auction provider HTTP [0-9]{3}$/.test(msg)?msg:'request-or-contract')
 process.exitCode=1
})
