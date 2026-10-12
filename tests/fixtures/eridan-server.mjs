import { createServer } from 'node:http'
const requests = []
const images = [1, 2, 3].map(n => 'https://cs.copart.com/test-gallery-' + n + '.jpg')
const cars = Array.from({ length: 30 }, (_, i) => ({
 id: 1000 + i, lot_number: String(70000000 + i), auction: i < 15 ? 'copart' : 'iaai',
 make: { id: 1, name: 'BMW' }, model: { id: 10, name: 'X5', make_id: 1 },
 year: 2022 + i % 3, name: (2022 + i % 3) + ' BMW X5',
 vin: 'WBA' + String(i).padStart(14, '0'), fuel: 'GAS', currency: 'USD',
 item_type: 'VEHTYPE_V', title_type: 'Certificate of Title', title_state: 'GA',
 seller: 'Test Seller', state: 'GA', city: 'Macon', engine: '3.0L', transmission: 'Automatic', drive: 'AWD',
 status: 'active', highlights: ['RUNS AND DRIVES'], primary_damage: { id: 1, name: 'Front End' },
 current_bid: 5500 + i * 100, odometer: 45000, sale_date: '2030-10-12T14:00:00.000Z', images, thumb_url: images[0],
}))
cars.push({ ...cars[0], id: 2000, lot_number: '80000000', make: { id: 2, name: 'Ford' }, model: { id: 20, name: 'Mustang', make_id: 2 }, name: '2022 Ford Mustang', vin: '1FA00000000000001' })
createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1'), p = url.searchParams
 const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
 if (url.pathname === '/') return send({ ok: true })
 if (url.pathname === '/test-requests') return send({ requests })
 if (req.headers.authorization !== 'Bearer eridan-local-fixture') return send({ error: 'unauthorized' }, 401)
 requests.push({ path: url.pathname, params: Object.fromEntries(p) })
 if (url.pathname === '/item_types') return send([{ value: 'VEHTYPE_V', label: 'Vehicle' }])
 if (url.pathname === '/fuel_types') return send(['GAS', 'DIESEL', 'ELECTRIC', 'HYBRID ENGINE'])
 if (url.pathname === '/makes') return send({ items: [{ id: 1, name: 'BMW' }, { id: 2, name: 'Ford' }], count: 2 })
 if (url.pathname === '/models') {
  const models = p.get('make__name') === 'BMW' ? [{ id: 10, name: 'X5', make_id: 1 }, { id: 11, name: 'X3', make_id: 1 }] : p.get('make__name') === 'Ford' ? [{ id: 20, name: 'Mustang', make_id: 2 }] : []
  return send({ items: models, count: models.length })
 }
 if (url.pathname !== '/lots') return send({ error: 'unknown endpoint' }, 404)
 const allowed = ['page', 'page_size', 'ordering', 'auction', 'lot_number', 'vin', 'make__name', 'model__name', 'year_from', 'year_to', 'fuel_type__name', 'item_type']
 if ([...p.keys()].some(key => !allowed.includes(key))) return send({ error: 'unknown filter' }, 422)
 const items = cars.filter(car =>
  ['auction', 'lot_number', 'vin', 'item_type'].every(key => !p.get(key) || car[key] === p.get(key)) &&
  (!p.get('make__name') || car.make.name === p.get('make__name')) &&
  (!p.get('model__name') || car.model.name === p.get('model__name')) &&
  (!p.get('fuel_type__name') || car.fuel === p.get('fuel_type__name')) &&
  (!p.get('year_from') || car.year >= Number(p.get('year_from'))) &&
  (!p.get('year_to') || car.year <= Number(p.get('year_to')))
 )
 items.sort((a, b) => b.id - a.id)
 const page = Number(p.get('page') || 1), size = Number(p.get('page_size') || 24)
 send({ items: items.slice((page - 1) * size, page * size), page, page_size: size, has_next: page * size < items.length })
}).listen(3199, '127.0.0.1')
