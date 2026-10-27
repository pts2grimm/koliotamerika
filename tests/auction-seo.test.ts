import test from 'node:test'
import assert from 'node:assert/strict'
import type { AuctionCar } from '../src/lib/auction-providers/types'
import { auctionSEO, archivedVehicleData } from '../src/lib/auction-seo'
import { sitemapLotURLs,sitemapXML,sitemapSearch,isAuctionSitemapSection } from '../src/lib/auction-sitemap'
const car:AuctionCar={id:'1:72239476',lot_id:72239476,site:1,title:'2019 PORSCHE MACAN S',make:'PORSCHE',model:'MACAN',year:2019,vehicle_type:'Automobile',auction_status:'active',auction_date:'2026-01-01T00:00:00Z',vin:'WP1AB2A57LLB32517',odometer:20000,odometer_unit:'unknown',link_img_hd:['https://cs.copart.com/test.jpg']}
test('archive metadata preserves lot identity and does not claim a sale from date alone',()=>{
 assert.match(auctionSEO(car).description,/Търгът е минал/)
 assert.doesNotMatch(auctionSEO(car).description,/Продаден/)
 assert.match(auctionSEO({...car,auction_status:'sold'}).description,/Продаден/)
 const meta=auctionSEO({...car,title:'Long model variant '.repeat(30)})
 assert.ok(meta.title.length<=70);assert.ok(meta.description.length<=180)
 assert.ok(meta.title.includes('72239476'))
})
test('archive schema describes the page without product eligibility or fabricated offers',()=>{
 for(const status of ['active','sold']){
  const graph=archivedVehicleData({...car,auction_status:status,buy_now:15000,current_bid:12000},'https://koliotamerika.bg',car.link_img_hd!)['@graph']
  const page=graph.find(item=>item['@type']==='WebPage')!
  assert.equal(page.url,'https://koliotamerika.bg/targove/kola?lot=72239476&site=1')
  assert.equal(page.name,car.title)
  assert.deepEqual(page.image,car.link_img_hd)
  assert.match(page.description,status==='sold'?/Продаден/:/Търгът е минал/)
  assert.doesNotMatch(JSON.stringify(graph),/"(?:Vehicle|Product|Car|Offer|AggregateOffer|offers|review|aggregateRating|about)"/)
 }
 const moto=archivedVehicleData({...car,vehicle_type:'ATVUTV'},'https://koliotamerika.bg',[])['@graph']
 assert.match(JSON.stringify(moto),/motori-atv\/arhiv/)
 assert.equal(moto.find(item=>item['@type']==='WebPage')!.image,undefined)
})
test('sitemap separates categories and lifecycle, skips gallery-less rows and de-duplicates lots',()=>{
 const active={...car,auction_date:'2099-01-01T00:00:00Z'}
 const rows=[car,car,active,{...active,lot_id:81111111,vehicle_type:'Motorcycle' as const},{...car,lot_id:82222222,link_img_hd:[]}]
 assert.deepEqual(sitemapLotURLs(rows,'https://koliotamerika.bg','cars-archive'),['https://koliotamerika.bg/targove/kola?lot=72239476&site=1'])
 assert.equal(sitemapLotURLs(rows,'https://koliotamerika.bg','powersports').length,1)
 assert.equal(sitemapLotURLs(Array.from({length:60},(_,i)=>({...active,lot_id:70000000+i})),'https://koliotamerika.bg','cars').length,48)
 assert.match(sitemapSearch('powersports-archive'),/archive=ended/)
 assert.equal(isAuctionSitemapSection('not-a-section'),false)
 const xml=sitemapXML(['https://koliotamerika.bg/targove/kola?lot=72239476&site=1'])
 assert.match(xml,/&amp;site=1/);assert.doesNotMatch(xml,/<lastmod>/)
})
