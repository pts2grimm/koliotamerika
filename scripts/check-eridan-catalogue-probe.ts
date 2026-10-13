import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { normalizeEridanCar } from '../src/lib/auction-providers/eridan'
import { isAuctionClosed } from '../src/lib/auction-lifecycle'
import { isEridanRoadModel } from '../src/lib/auction-providers/eridan-scope'
async function main(){
 const schema=await (await fetch('https://catalog.eridan.software/api/openapi.json')).json()
 const path=Object.keys(schema.paths).find(p=>/\/lots\/?$/.test(p))!
 console.log('QUERY_CONTRACT',JSON.stringify(schema.paths[path].get.parameters))
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 for(const auction of ['copart','iaai']) for(const type of ['VEHTYPE_V','VEHTYPE_M']) for(const ordering of ['-id','-sale_date']){
  let total=0,kept=0,expired=0,undated=0,hasNext=false,fetches=0
  const started=Date.now()
  for(let page=1;page<=4;page++){
   const data=await request('/lots',new URLSearchParams({make__name:'BMW',auction,item_type:type,status:'active',has_images:'true',ordering,page:String(page),page_size:'100'})) as {items:Record<string,unknown>[],has_next:boolean}
   fetches++;hasNext=data.has_next
   for(const raw of data.items){
    total++;const car=normalizeEridanCar(raw)
    if(car&&isAuctionClosed(car))expired++
    if(car&&!car.auction_date)undated++
    if(car?.auction_status==='active'&&!isAuctionClosed(car)&&car.link_img_hd?.length&&isEridanRoadModel(car.model,car.make))kept++
   }
   if(!hasNext||kept>=25)break
  }
  console.log('BMW_STREAM_COUNTS',JSON.stringify({auction,type,ordering,fetches,total,kept,expired,undated,hasNext,ms:Date.now()-started}))
 }
}
main().catch(e=>{const m=e instanceof Error?e.message:'';console.error('PROBE_FAILED',/^Auction provider HTTP \d{3}$/.test(m)?m:'request-or-contract');process.exitCode=1})
