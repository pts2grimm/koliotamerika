// Isolated upstream for browser tests; never calls the real auction provider.
import { createServer } from 'node:http'
import { messages } from './mail-server.mjs'
const requests = []
const images = [1, 2, 3].map(n => `https://cs.copart.com/test-gallery-${n}.jpg`)
const cars = Array.from({ length: 30 }, (_, index) => ({
 lot_id: 70000000 + index, site: index < 15 ? 1 : 2,
 make: 'BMW', model: 'X5', year: 2022 + index % 3, title: `${2022 + index % 3} BMW X5`,
 vin: `TESTVIN${String(index).padStart(10, '0')}`, fuel: 'Gasoline', seller_type: 'insurance',
 document_old: 'Certificate of Title (GA)', seller: 'Test Insurance', state: 'GA', location: 'Macon (GA)', engine: '3.0L', transmission: 'Automatic', drive: 'AWD',
 status: 'Run & Drive', damage_pr: 'Front End', current_bid: 5500 + index * 100, odometer: 45000,
 auction_date: index === 1 ? undefined : index === 2 ? 'invalid-date' : index === 3 ? '2020-10-12T14:00:00.000Z' : '2030-10-12T14:00:00.000Z',
 link_img_hd: images, link_img_small: images,
}))
// A structurally valid fixture VIN for the private request-log regression.
cars[24].vin = 'WBS8M9C59J5J79848'
cars[4].video_url = ['https://cs.copart.com/test-engine.mp4']
cars[5].videoLink = 'https://youtu.be/abcdefghijk'
cars[6].video = 'https://cs.copart.com/test-engine-broken.mp4'
cars[7].video = 'https://cs.copart.com/test-engine.mp4'; cars[7].link_img_hd = []; cars[7].link_img_small = []
cars.push({ ...cars[0], lot_id: 80000000, make: 'Ford', model: 'Mustang', title: '2022 Ford Mustang', vin: 'FORDTEST000000001' })
createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost')
 const params = url.searchParams
 if (['/search', '/car', '/makes-models', '/lookup'].includes(url.pathname)) requests.push({ path: url.pathname, params: Object.fromEntries(params) })
 if (process.env.FIXTURE_AUCTION_DELAY_MS && ['/search', '/car', '/makes-models'].includes(url.pathname)) await new Promise(resolve => setTimeout(resolve, Number(process.env.FIXTURE_AUCTION_DELAY_MS)))
 let body = { success: true }
 if (url.pathname === '/test-requests') body = { requests }
 else if (url.pathname === '/test-mail') body = { messages }
 else if (url.pathname === '/makes-models') body.map = { BMW: ['X3', 'X5'], Ford: ['Mustang'], Toyota: ['RAV4'] }
 else if (url.pathname === '/search') {
  const items = cars.filter(car => ['site', 'make', 'model', 'status', 'fuel', 'seller_type'].every(key => !params.get(key) || String(car[key]) === params.get(key)) && (!params.get('year_from') || car.year >= Number(params.get('year_from'))) && (!params.get('year_to') || car.year <= Number(params.get('year_to'))))
  const size = Number(params.get('size') || 12), page = Number(params.get('page') || 1)
  body = { success: true, total: items.length, items: items.slice((page - 1) * size, page * size) }
 } else if (url.pathname === '/car') body.item = cars.find(car => String(car.lot_id) === params.get('lot_id') && String(car.site) === params.get('site'))
 else if (url.pathname === '/lookup') { const car = cars.find(car => String(car.lot_id) === params.get('q')); body = car ? { success: true, lot_id: car.lot_id, site: car.site } : { success: false } }
 res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body))
}).listen(3199, '127.0.0.1')
