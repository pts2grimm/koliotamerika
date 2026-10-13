import assert from 'node:assert/strict'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { normalizeEridanCar } from '../src/lib/auction-providers/eridan'
import { auctionSchedule, parseAuctionDate } from '../src/lib/auction-schedule'

async function main() {
 assert.ok(process.env.ERIDAN_API_KEY, 'Missing protected API credential')
 const schemaResponse = await fetch('https://catalog.eridan.software/api/openapi.json', {signal: AbortSignal.timeout(15000), redirect: 'error'})
 assert.ok(schemaResponse.ok)
 const schema = await schemaResponse.json()
 console.log('SCHEDULE_ENDPOINTS', JSON.stringify(Object.entries(schema.paths || {}).map(([path,value])=>({path,operations:Object.entries(value as Record<string,unknown>).filter(([method])=>method==='get').map(([method,op])=>({method,...op as Record<string,unknown>}))}))))
 console.log('SCHEDULE_SCHEMA', JSON.stringify(Object.entries(schema.components?.schemas || {}).flatMap(([name, value]) => {
  const properties = (value as {properties?: Record<string,unknown>}).properties
  return properties && ('sale_date' in properties || 'next_sale_date' in properties)
   ? [{name, properties: Object.fromEntries(Object.entries(properties))}] : []
 })))
 const request = createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const response = await request('/lots', new URLSearchParams({lot_number:'57397516',auction:'copart',ordering:'-updated_at',page:'1',page_size:'10'})) as {items:Record<string,unknown>[],has_next:boolean}
 assert.ok(Array.isArray(response.items))
 console.log('SCHEDULE_NOW', new Date().toISOString())
 console.log('SCHEDULE_MATCHES', {count:response.items.length,hasNext:response.has_next})
 for (const row of response.items) {
  const car=normalizeEridanCar(row)
  console.log('SCHEDULE_ROW', {id:row.id,isFutureSale:row.is_future_sale,keys:Object.keys(row),fields:Object.fromEntries(Object.entries(row).filter(([key,value])=> /date|time|status|sold/i.test(key) && (value===null || ['string','number','boolean'].includes(typeof value)))),normalized:car?.auction_date,schedule:auctionSchedule(parseAuctionDate(car?.auction_date),Date.now())})
 }

 // Read a small current feed sample to distinguish historical records from upcoming sales.
 for (const auction of ['copart','iaai']) {
  const sample = await request('/lots', new URLSearchParams({auction, sale_date__gte:new Date().toISOString(), ordering:'sale_date', page:'1', page_size:'5'})) as {items:Record<string,unknown>[]}
  assert.ok(Array.isArray(sample.items))
  console.log('SCHEDULE_UPCOMING_SAMPLE', JSON.stringify({auction,items:sample.items.map(row=>({lot:row.lot_number,status:row.status,sale_date:row.sale_date,is_future_sale:row.is_future_sale,updated_at:row.updated_at,auction_last_update:row.auction_last_update}))}))
 }
 const future = await request('/lots', new URLSearchParams({lot_number:'57397516',auction:'copart',sale_date__gte:new Date().toISOString(),page:'1',page_size:'10'})) as {items:Record<string,unknown>[],has_next:boolean}
 console.log('SCHEDULE_REPORTED_FUTURE', {count:future.items?.length,hasNext:future.has_next})

 const site = await fetch('https://darkturquoise-duck-750266.hostingersite.com/targove/kola?lot=57397516&site=1', {signal:AbortSignal.timeout(30000)})
 const html = await site.text()
 console.log('SCHEDULE_STAGING', {status:site.status,pastLabel:html.includes('Посоченият час е минал'),unknownLabel:html.includes('Очаква се дата'),timeTags:html.match(/<time[^>]*>[^<]*<\/time>/g)?.slice(0,3)})
}
main().catch(error => {
 const message=error instanceof Error ? error.message : ''
 console.error('SCHEDULE_CHECK_FAILED', /^Auction provider HTTP [0-9]{3}$/.test(message)?message:'request-or-contract')
 process.exitCode=1
})
