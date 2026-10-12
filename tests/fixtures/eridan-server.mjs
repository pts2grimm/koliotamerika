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
 current_bid: i === 0 ? 0 : i === 1 ? null : 5500 + i * 100, buy_now_price: i === 1 ? 9999 : null, final_bid: i === 1 ? 8888 : null, odometer: 45000, sale_date: '2030-10-12T14:00:00.000Z', images, thumb_url: 'https://cs.copart.com/test-gallery-thumb.jpg',
}))
cars.push({ ...cars[0], id: 2000, lot_number: '80000000', make: { id: 2, name: 'Ford' }, model: { id: 20, name: 'Mustang', make_id: 2 }, name: '2022 Ford Mustang', vin: '1FA00000000000001' })
cars.push({ ...cars[0], id: 3000, vin: 'JH200000000000001', lot_number: '81000000', item_type: 'VEHTYPE_M', make: { id: 3, name: 'Honda' }, model: { id: 30, name: 'CBR600RR', make_id: 3 }, name: '2022 Honda CBR600RR' })
cars.push({ ...cars[0], id: 4000, vin: 'CAT00000000000001', lot_number: '82000000', item_type: 'VEHTYPE_E', make: { id: 4, name: 'CATERPILLAR' }, model: { id: 40, name: 'D6', make_id: 4 }, name: 'Caterpillar excavator' })
cars.push({ ...cars[0], id: 5000, vin: 'SEA00000000000001', lot_number: '83000000', item_type: 'VEHTYPE_M', make: { id: 5, name: 'SEA RAY' }, model: { id: 50, name: 'BOAT', make_id: 5 }, name: 'Sea Ray boat' })
cars.push({ ...cars[0], id: 6000, vin: 'WBA00000000000099', lot_number: '84000000', images: [], name: '2022 BMW X5 incomplete gallery' })
createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1'), p = url.searchParams
 const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
 if (url.pathname === '/') return send({ ok: true })
 if (url.pathname === '/test-requests') return send({ requests })
 if (req.headers.authorization !== 'Bearer eridan-local-fixture') return send({ error: 'unauthorized' }, 401)
 requests.push({ path: url.pathname, params: Object.fromEntries(p) })
 if (url.pathname === '/item_types') return send([{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }])
 if (url.pathname === '/fuel_types') return send(['GAS', 'DIESEL', 'ELECTRIC', 'HYBRID ENGINE'])
 if (url.pathname === '/makes') return send({ items: [{ id: 1, name: 'BMW' }, { id: 2, name: 'Ford' }, { id: 3, name: 'Honda' }, { id: 4, name: 'CATERPILLAR' }, { id: 5, name: 'SEA RAY' }, { id: 6, name: '*' }], count: 6 })
 if (url.pathname === '/models') {
  const models = p.get('make__name') === 'BMW' ? [{ id: 10, name: 'X5', make_id: 1 }, { id: 11, name: 'X3', make_id: 1 }] : p.get('make__name') === 'Ford' ? [{ id: 20, name: 'Mustang', make_id: 2 }] : p.get('make__name') === 'Honda' ? [{ id: 30, name: 'CBR600RR', make_id: 3 }] : []
  return send({ items: models, count: models.length })
 }
 // A detail-only fixture proves streaming while the upstream lookup is slow.
 if (url.pathname === '/lots' && p.get('lot_number') === '79999001') {
  setTimeout(()=>send({ items: [{ ...cars[0], id: 99999, lot_number: '79999001', name: '2023 BMW X5 streaming fixture' }], page: 1, page_size: 10, has_next: false }), 2000)
  return
 }
 if (url.pathname !== '/lots') return send({ error: 'unknown endpoint' }, 404)
 const allowed = ['page', 'page_size', 'ordering', 'auction', 'lot_number', 'vin', 'make__name', 'model__name', 'year_from', 'year_to', 'fuel_type__name', 'item_type', 'has_images', 'makes']
 if ([...p.keys()].some(key => !allowed.includes(key))) return send({ error: 'unknown filter' }, 422)
 const items = cars.filter(car =>
  (!p.get('has_images') || car.images.length > 0) &&
  (!p.has('makes') || p.getAll('makes').at(-1).split(',').some(make => make.toLowerCase() === car.make.name.toLowerCase())) &&
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
