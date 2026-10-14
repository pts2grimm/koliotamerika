import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEridanProvider, normalizeEridanCar, UnsupportedEridanFilterError, EridanSearchLimitError } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { isEridanRoadModel } from '../src/lib/auction-providers/eridan-scope'
import userLot from './fixtures/eridan-user-lot.json'
import { auctionSchedule, parseAuctionDate } from '../src/lib/auction-schedule'
import { mileage } from '../src/lib/vehicle-details'
import type { AuctionTransport } from '../src/lib/auction-providers/types'

const row = {
 id: 42, lot_number: '70000001', auction: 'copart', name: '2023 BMW X5',
 make: { id: 1, name: 'BMW' }, model: { id: 10, name: 'X5', make_id: 1 }, year: 2023, item_type: 'VEHTYPE_V',
 vin: 'WBA12345678901234', current_bid: 0, buy_now_price: 15000, currency: 'USD',
 odometer: 24000, status: 'active', highlights: ['RUNS AND DRIVES'], primary_damage: { id: 1, name: 'Front End' },
 title_type: 'Salvage', title_state: 'GA', seller: 'Example Insurance', fuel: 'GAS',
 images: ['https://cs.copart.com/car.jpg'], thumb_url: 'https://cs.copart.com/thumb.jpg',
 sale_date: '2030-10-12T14:00:00Z', city: 'Macon', state: 'GA',
}
const envelope = (items: unknown[], page = 1, has_next = false, page_size = 24) => ({ items, page, page_size, has_next })
function fixture(answer?: (path: string, params: URLSearchParams) => unknown) {
 const calls: { path: string; params: URLSearchParams }[] = []
 const request: AuctionTransport = async (path, params) => {
  calls.push({ path, params: new URLSearchParams(params) })
  if (path === '/item_types') return [{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }, { value: 'VEHTYPE_A', label: 'ATV' }]
  if (path === '/models' && !answer) return {items:[{id:10,name:'X5',make_id:1}],count:1}
  if (path === '/fuel_types') return ['GAS', 'DIESEL', 'HYBRID ENGINE', 'ELECTRIC']
  return answer ? answer(path, params) : envelope([row], Number(params.get('page') || 1), false)
 }
 return { calls, provider: createEridanProvider(request) }
}
test('Eridan keeps auction lot identity instead of internal record id; nullable values and zero are distinct', () => {
 const car = normalizeEridanCar(row)!
 assert.equal(car.id, '1:70000001'); assert.equal(car.lot_id, 70000001)
 assert.equal(car.current_bid, 0); assert.equal(car.make, 'BMW'); assert.equal(car.model, 'X5')
 assert.equal(car.damage_pr, 'Front End'); assert.equal(car.status, 'Run & Drive')
 assert.equal(car.seller_type, car.seller ? 'insurance' : 'dealer'); assert.equal(car.odometer_unit, 'unknown')
 assert.equal(normalizeEridanCar({ ...row, auction: 'iaai' })?.id, '2:70000001')
 assert.equal(normalizeEridanCar({ ...row, auction: 'unknown' }), undefined)
 assert.equal(normalizeEridanCar({ ...row, lot_number: undefined }), undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: null })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: '' })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: -1 })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, currency: 'UNKNOWN' })?.current_bid, undefined)
})
test('Eridan separates lifecycle and mechanical status from the configured seller convention', () => {
 const car = normalizeEridanCar({ ...row, status: 'sold', highlights: [] })!
 assert.equal(car.status, undefined); assert.equal(car.seller_type, car.seller ? 'insurance' : 'dealer')
 assert.equal(normalizeEridanCar({ ...row, highlights: ['Engine Start Program'] })?.status, 'Starts')
})
test('Eridan only passes HTTPS images without embedded credentials, preserves order and limits image count', () => {
 const car = normalizeEridanCar({ ...row, images: ['http://cs.copart.com/a', 'https://user:pass@cs.copart.com/a', ...Array.from({ length: 60 }, (_, i) => 'https://cs.copart.com/' + i)] })!
 assert.equal(car.link_img_hd?.length, 40); assert.equal(car.link_img_hd?.[0], 'https://cs.copart.com/0')
})
test('Eridan translates filters, keeps 24 results for both auctions, and never invents totals', async () => {
 const { provider, calls } = fixture()
 const data = await provider.search(new URLSearchParams({ make: 'BMW', model: 'X5', year_from: '2020', year_to: '2024', site: '1,2', vehicle_type: 'Automobile', size: '12', page: '2' }))
 const query = calls.find(call => call.path === '/lots')!.params
 assert.equal(query.get('make__name'), 'BMW'); assert.equal(query.get('model_ids'), '10'); assert.equal(query.get('model__name'), null)
 assert.equal(query.get('status'), 'active'); assert.equal(query.get('year_from'), '2020'); assert.equal(query.get('year_to'), '2024')
 assert.equal(query.get('item_type'), 'VEHTYPE_V')
 assert.equal(query.get('page_size'), '49'); assert.equal(query.get('page'), '1'); assert.equal(query.get('auction'), 'copart')
 assert.ok(calls.some(call=>call.params.get('auction')==='iaai'))
 assert.equal(data.total, null); assert.equal(data.totalPages, null); assert.equal(data.hasNext, false)
})
test('single auction query is scoped, with no unsupported parameters leaked to Eridan', async () => {
 const { provider, calls } = fixture()
 await provider.search(new URLSearchParams({ site: '2', size: '12', made_up: 'ignored' }))
 const params = calls.find(call => call.path === '/lots')!.params
 assert.equal(params.get('auction'), 'iaai'); assert.equal(params.get('page_size'), '13'); assert.equal(params.get('made_up'), null)
 await assert.rejects(() => provider.search(new URLSearchParams('site=3')), /Invalid auction/)
})
test('unsupported conditions/seller categories/invalid cylinder filters fail explicitly before any paid request', async () => {
 for (const [key, value] of [['status', "Can't test"], ['seller_type', 'unknown'], ['cylinders', '17']]) {
  const { provider, calls } = fixture()
  await assert.rejects(() => provider.search(new URLSearchParams({ [key]: value })), UnsupportedEridanFilterError)
  assert.equal(calls.length, 0)
 }
})
test('unconfirmed vehicle categories do not silently return motorcycles or trucks', async () => {
 const provider = createEridanProvider(async () => [{ value: 'VEHTYPE_M', label: 'Motorcycle' }])
 await assert.rejects(() => provider.search(new URLSearchParams({ vehicle_type: 'Automobile' })), /category is not confirmed/)
})
test('detail resolves old public lot/site URLs using lot_number, never /lots/{internal id}', async () => {
 const { provider, calls } = fixture(() => envelope([{ ...row, auction: 'iaai' }, row]))
 const car = await provider.detail('70000001', '1')
 assert.equal(car?.id, '1:70000001')
 assert.equal(calls.length, 1); assert.equal(calls[0].path, '/lots')
 assert.equal(calls[0].params.get('status'), null); assert.equal(calls[0].params.get('ordering'), '-sale_date'); assert.equal(calls[0].params.get('lot_number'), '70000001'); assert.equal(calls[0].params.get('auction'), 'copart')
 const wrong = fixture(() => envelope([{ ...row, lot_number: '70000002' }]))
 assert.equal(await wrong.provider.detail('70000001', '1'), undefined)
})
test('VIN lookup is exact and numeric lookup checks both auctions without swallowing access failures', async () => {
 const vin = fixture(() => envelope([row]))
 assert.deepEqual(await vin.provider.lookup('wba12345678901234'), { lot: '70000001', site: '1' })
 assert.equal(vin.calls[0].params.get('vin'), row.vin)
 const number = fixture((_, params) => envelope(params.get('auction') === 'iaai' ? [{ ...row, auction: 'iaai' }] : []))
 assert.deepEqual(await number.provider.lookup('70000001'), { lot: '70000001', site: '2' })
 assert.equal(number.calls.length, 2)
 const provider = createEridanProvider(async () => { throw new Error('Auction provider HTTP 403') })
 await assert.rejects(() => provider.lookup('70000001'), /403/)
 const mismatch = fixture(() => envelope([{ ...row, vin: 'WBA00000000000000' }]))
 await assert.rejects(() => mismatch.provider.lookup(row.vin), /VIN not found/)
})
test('make directories are complete and models load only for the selected make', async () => {
 const { provider, calls } = fixture((path, params) => {
  const second = params.get('page') === '2'
  if (path === '/makes') return { items: [second ? { id: 2, name: 'Ford' } : { id: 1, name: 'BMW' }], count: 2 }
  assert.equal(params.get('make__name'), 'BMW')
  return { items: [second ? { id: 11, name: 'X3', make_id: 1 } : { id: 10, name: 'X5', make_id: 1 }], count: 2 }
 })
 const map = await provider.makes()
 assert.deepEqual(map, { BMW: [], Ford: [] }); assert.equal(Object.getPrototypeOf(map), Object.prototype); assert.equal(calls.length, 2)
 assert.deepEqual(await provider.models!('BMW'), ['X3', 'X5']); assert.equal(calls.length, 4)
})
test('incomplete directories and malformed pagination fail instead of being cached as an empty catalogue', async () => {
 const { provider } = fixture(() => ({ count: 2, items: [{ id: 1, name: 'BMW' }] }))
 await assert.rejects(() => provider.makes(), /Incomplete/)
 await assert.rejects(() => fixture(() => ({ items: [row] })).provider.search(new URLSearchParams()), /Invalid Eridan catalogue/)
 await assert.rejects(() => fixture(() => envelope([{ ...row, lot_number: 'invalid' }])).provider.search(new URLSearchParams()), /identity/)
})
test('mileage units are explicit; unknown units are not multiplied by 1.609344', () => {
 assert.match(mileage(1000, 'unknown')!, /мерната единица/)
 assert.doesNotMatch(mileage(1000, 'unknown')!, /mi|km/)
 assert.equal(mileage(1000, 'km')!.replace(/\s/g, ''), '1000km')
 assert.match(mileage(1000)!, /mi/); assert.equal(mileage(undefined, 'unknown'), undefined)
})
test('transport sends Bearer auth only to the fixed Eridan origin and rejects redirects', async () => {
 let seen: { url: URL; init: RequestInit } | undefined
 const request = createEridanTransport({ apiKey: 'test-only-key', fetch: async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ ok: true }) } } })
 await request('/lots', new URLSearchParams('page=1'))
 assert.equal(seen!.url.origin, 'https://catalog.eridan.software')
 assert.equal(seen!.url.pathname, '/api/lots'); assert.equal(seen!.url.search, '?page=1')
 assert.equal((seen!.init.headers as Record<string, string>).Authorization, 'Bearer test-only-key')
 assert.equal(seen!.init.redirect, 'error'); assert.ok(seen!.init.signal)
 await assert.rejects(() => request('//untrusted.test', new URLSearchParams()), /Unsupported/)
})
test('missing credentials make no request; local overrides can never receive a real key', async () => {
 let calls = 0
 const fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({}) } }
 await assert.rejects(() => createEridanTransport({ fetch })('/lots', new URLSearchParams()), /missing/)
 assert.equal(calls, 0)
 assert.throws(() => createEridanTransport({ apiKey: 'real-key', testBaseURL: 'http://127.0.0.1:3199', fetch }), /Invalid Eridan test/)
 assert.throws(() => createEridanTransport({ apiKey: 'eridan-local-fixture', testBaseURL: 'http://untrusted.test', fetch }), /Invalid Eridan test/)
})
test('access and rate errors pause later requests, do not retry and never expose upstream error bodies', async () => {
 for (const status of [401, 403, 429]) {
  let time = 1000000, calls = 0, canceled = 0
  const request = createEridanTransport({ apiKey: 'test-key', now: () => time, fetch: async () => {
   calls++; return { ok: false, status, json: async () => { throw new Error('private upstream content') }, body: { cancel: async () => { canceled++ } } }
  } })
  await assert.rejects(() => request('/lots', new URLSearchParams()), new RegExp('HTTP ' + status))
  await assert.rejects(() => request('/makes', new URLSearchParams()), /temporarily paused/)
  assert.equal(calls, 1); assert.equal(canceled, 1)
  time += status === 429 ? 60001 : 1800001
  await assert.rejects(() => request('/lots', new URLSearchParams()), new RegExp('HTTP ' + status))
  assert.equal(calls, 2)
 }
})
test('normal searches remain available after more than 20 requests in the same minute', async () => {
 let calls = 0
 const request = createEridanTransport({ apiKey: 'test-key', now: () => 1000000, fetch: async () => {
  calls++; return { ok: true, status: 200, json: async () => ({}) }
 } })
 for (let i = 0; i < 40; i++) await request(i % 2 ? '/lots' : '/models', new URLSearchParams())
 assert.equal(calls, 40)
})

test('one shared concurrency limit includes directories, searches and response bodies', async () => {
 let active = 0, peak = 0
 const request = createEridanTransport({ apiKey: 'test-key', fetch: async () => {
  active++; peak = Math.max(peak, active)
  return { ok: true, status: 200, json: async () => {
   await new Promise(resolve => setTimeout(resolve, 5))
   active--; return {}
  } }
 } })
 await Promise.all(Array.from({ length: 12 }, (_, i) => request(i % 2 ? '/lots' : '/makes', new URLSearchParams())))
 assert.equal(peak, 2); assert.equal(active, 0)
})

test('a temporary gateway error retries once with the identical query and deadline', async () => {
 for (const status of [502, 503, 504]) {
  const seen: { url: string; signal: AbortSignal | null | undefined }[] = []
  let canceled = 0
  const request = createEridanTransport({ apiKey: 'test-key', fetch: async (url, init) => {
   seen.push({ url: url.href, signal: init.signal })
   if (seen.length === 1) return { ok: false, status, json: async () => ({}), body: { cancel: async () => { canceled++ } } }
   return { ok: true, status: 200, json: async () => ({ recovered: true }) }
  } })
  assert.deepEqual(await request('/lots', new URLSearchParams('auction=copart&make__name=BMW')), { recovered: true })
  assert.equal(seen.length, 2); assert.equal(seen[0].url, seen[1].url)
  assert.equal(seen[0].signal, seen[1].signal); assert.equal(canceled, 1)
 }
})

test('persistent failures have at most one retry and keep secrets out of errors', async () => {
 for (const status of [503, 422, 500]) {
  let calls = 0
  const request = createEridanTransport({ apiKey: 'test-key', fetch: async () => {
   calls++; return { ok: false, status, json: async () => { throw new Error('private response') } }
  } })
  await assert.rejects(() => request('/lots', new URLSearchParams()), new RegExp('^Error: Auction provider HTTP ' + status + '$'))
  assert.equal(calls, status === 503 ? 2 : 1)
 }
 let calls = 0
 const fail = createEridanTransport({ apiKey: 'test-key', fetch: async () => { calls++; throw new Error('private header content') } })
 await assert.rejects(() => fail('/lots', new URLSearchParams()), error => error instanceof Error && error.message === 'Eridan connection failed')
 assert.equal(calls, 2)
})

test('Retry-After seconds and HTTP dates control the real rate-limit pause', async () => {
 for (const header of ['120', new Date(1120000).toUTCString()]) {
  let time = 1000000, calls = 0
  const request = createEridanTransport({ apiKey: 'test-key', now: () => time, fetch: async () => {
   calls++
   return calls === 1
    ? { ok: false, status: 429, headers: { get: () => header }, json: async () => ({}) }
    : { ok: true, status: 200, json: async () => ({}) }
  } })
  await assert.rejects(() => request('/lots', new URLSearchParams()), /HTTP 429/)
  time += 60001
  await assert.rejects(() => request('/lots', new URLSearchParams()), /temporarily paused/)
  assert.equal(calls, 1)
  time += 60000
  await request('/lots', new URLSearchParams())
  assert.equal(calls, 2)
 }
})

test('queued requests recheck an upstream pause before contacting Eridan', async () => {
 let calls = 0
 const request = createEridanTransport({ apiKey: 'test-key', fetch: async () => {
  calls++
  await new Promise(resolve => setTimeout(resolve, 5))
  return { ok: false, status: 429, json: async () => ({}) }
 } })
 const results = await Promise.allSettled(Array.from({ length: 8 }, () => request('/lots', new URLSearchParams())))
 assert.equal(calls, 2)
 assert.ok(results.every(result => result.status === 'rejected'))
})

test('timed out queue entries never fetch later and release capacity for recovery', async () => {
 let calls = 0, slow = true
 const request = createEridanTransport({ apiKey: 'test-key', timeoutMs: 30, fetch: async (_, init) => {
  calls++
  if (slow) await new Promise((_, reject) => {
   const timer = setTimeout(() => reject(new Error('test safeguard')), 200)
   init.signal!.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('private timeout')) }, { once: true })
  })
  return { ok: true, status: 200, json: async () => ({}) }
 } })
 const results = await Promise.allSettled(Array.from({ length: 5 }, () => request('/lots', new URLSearchParams())))
 assert.ok(results.every(result => result.status === 'rejected' && /timed out/.test(result.reason.message)))
 const before = calls
 slow = false
 await request('/lots', new URLSearchParams())
 assert.equal(calls, before + 1)
})

test('fuel aliases from both auctions merge before pagination, without duplicates, skips or invented totals', async () => {
 const data = Array.from({ length: 55 }, (_, i) => ({ ...row, id: 100 + i, lot_number: String(71000000 + i), auction: i % 2 ? 'iaai' : 'copart', fuel: i % 2 ? 'Gasoline' : 'GAS' }))
 const provider = createEridanProvider(async (path, params) => {
  if (path === '/item_types') return [{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }, { value: 'VEHTYPE_A', label: 'ATV' }]
  if (path === '/fuel_types') return ['GAS', 'Gas', 'Gasoline']
  const fuel = params.get('fuel_type__name')!.toLowerCase()
  const matches = data.filter(item => item.fuel.toLowerCase() === fuel && item.auction === params.get('auction')).sort((a, b) => b.id - a.id)
  const page = Number(params.get('page'))
  // Upstream clamps requested windows: the adapter must follow every stream correctly.
  const size = Math.min(10, Number(params.get('page_size')))
  return envelope(matches.slice((page - 1) * size, page * size), page, page * size < matches.length, size)
 })
 const pages = []
 for (const page of [1, 2, 3]) pages.push(await provider.search(new URLSearchParams({ site: '1,2', vehicle_type: 'Automobile', fuel: 'Gasoline', page: String(page), size: '12' })))
 assert.deepEqual(pages.map(page => page.items.length), [24, 24, 7])
 assert.deepEqual(pages.map(page => page.hasNext), [true, true, false])
 assert.deepEqual(pages.flatMap(page => page.items.map(car => car.lot_id)), data.toSorted((a, b) => b.id - a.id).map(item => Number(item.lot_number)))
 assert.equal(new Set(pages.flatMap(page => page.items.map(car => car.id))).size, 55)
 assert.ok(pages.every(page => page.total === null && page.totalPages === null))
 assert.ok(pages.flatMap(page => page.items).every(car => car.fuel === 'Gasoline'))
})
test('hybrid search includes both hybrid labels; electric search does not include gasoline hybrids', async () => {
 const calls: string[] = []
 const provider = createEridanProvider(async (path, params) => {
  if (path === '/item_types') return [{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }, { value: 'VEHTYPE_A', label: 'ATV' }]
  if (path === '/fuel_types') return ['HYBRID ENGINE', 'ELECTRIC AND GAS HYBRID', 'Hybrid', 'Electric', 'ELECTRIC VEHICLE']
  calls.push(params.get('fuel_type__name')!)
  return envelope([], Number(params.get('page')), false, Number(params.get('page_size')))
 })
 await provider.search(new URLSearchParams('fuel=Hybrid&vehicle_type=Automobile'))
 assert.deepEqual(calls, ['HYBRID ENGINE', 'HYBRID ENGINE', 'ELECTRIC AND GAS HYBRID', 'ELECTRIC AND GAS HYBRID', 'Hybrid', 'Hybrid'])
 calls.length = 0
 await provider.search(new URLSearchParams('fuel=Electric&vehicle_type=Automobile'))
 assert.deepEqual(calls, ['Electric', 'Electric', 'ELECTRIC VEHICLE', 'ELECTRIC VEHICLE'])
})


test('road catalogue merges cars and motorcycles with full galleries before pagination, excludes marine/equipment rows and fills pages', async () => {
 const rows = Array.from({ length: 19 }, (_, i) => ({
  ...row, id: 100 + i, lot_number: String(72000000 + i),
  item_type: i % 2 ? 'VEHTYPE_M' : 'VEHTYPE_V',
  model: { id: 10 + i, name: i % 2 ? 'S 1000' : 'X5' },
 }))
 const excluded = [
  { ...row, id: 200, lot_number: '72900000', images: [] },
  { ...row, id: 201, lot_number: '72900001', item_type: 'VEHTYPE_L' },
  { ...row, id: 202, lot_number: '72900002', item_type: 'VEHTYPE_E', make: { id: 3, name: 'CATERPILLAR' } },
  { ...row, id: 203, lot_number: '72900003', item_type: 'VEHTYPE_M', make: { id: 4, name: 'SEA RAY' }, model: { id: 1, name: '190 SIGNATURE' } },
  { ...row, id: 204, lot_number: '72900004', item_type: 'VEHTYPE_M', make: { id: 5, name: 'YAMAHA' }, model: { id: 2, name: 'WAVERUNNER' } },
 ]
 const queries: URLSearchParams[] = []
 const provider = createEridanProvider(async (path, params) => {
  if (path === '/item_types') return [{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }, { value: 'VEHTYPE_A', label: 'ATV' }]
  queries.push(new URLSearchParams(params))
  assert.equal(params.get('has_images'), 'true')
  assert.equal(params.getAll('makes').length, 1)
  assert.ok(params.get('makes')!.split(',').includes(params.get('item_type') === 'VEHTYPE_A' ? 'POLARIS' : 'BMW'))
  assert.ok(params.get('makes')!.split(',').includes('HONDA'))
  assert.ok(!params.get('makes')!.split(',').includes('CATERPILLAR'))
  // Include known upstream bad rows deliberately, even though a correctly scoped API would exclude them.
  const all = [...rows.filter(row => row.item_type === params.get('item_type') && row.auction === params.get('auction')), ...excluded].sort((a,b) => b.id-a.id)
  const page = Number(params.get('page')), size = Math.min(8, Number(params.get('page_size')))
  return envelope(all.slice((page-1)*size,page*size),page,page*size<all.length,size)
 })
 const first = await provider.search(new URLSearchParams('size=6&site=1,2'))
 const second = await provider.search(new URLSearchParams('size=6&site=1,2&page=2'))
 assert.deepEqual([first.items.length,second.items.length], [12,7])
 assert.deepEqual([first.hasNext,second.hasNext], [true,false])
 assert.deepEqual([...first.items,...second.items].map(car=>car.lot_id),rows.toSorted((a,b)=>b.id-a.id).map(row=>Number(row.lot_number)))
 assert.deepEqual([...new Set(queries.map(query=>query.get('item_type')))].sort(),['VEHTYPE_A','VEHTYPE_M','VEHTYPE_V'])
 const bikes = await provider.search(new URLSearchParams('size=6&vehicle_type=Motorcycle'))
 assert.ok(bikes.items.every(car=>car.vehicle_type==='Motorcycle'))
 await assert.rejects(()=>provider.search(new URLSearchParams('vehicle_type=Boat')),UnsupportedEridanFilterError)
})
test('road directories retain car and motorcycle makes while removing equipment, marine and placeholder entries', async () => {
 const makes = ['BMW','HONDA','YAMAHA','VESPA','MERCEDES-BENZ','CATERPILLAR','SEA RAY','UNKNOWN','*','0084']
 const models = ['X5','S 1000','BOAT W/TRL','WAVERUNNER','UNKNOWN','*']
 const provider = createEridanProvider(async path=>{
  const names = path === '/makes' ? makes : models
  return {items:names.map((name,id)=>({id,name})),count:names.length}
 })
 assert.deepEqual(Object.keys(await provider.makes()), makes.slice(0,5))
 assert.deepEqual(await provider.models!('BMW'), ['S 1000','X5'])
 assert.deepEqual(await provider.models!('CATERPILLAR'), [])
})
test('full gallery wins over the thumbnail without synthesizing image URLs; old incomplete lot remains addressable', async () => {
 const images = Array.from({length:17},(_,i)=>'https://vis.iaai.com/resizer?imageKeys=example~I'+(i+1))
 const car = normalizeEridanCar({...row,images})!
 assert.deepEqual(car.link_img_hd,images)
 assert.deepEqual(car.link_img_small,[row.thumb_url])
 const {provider}=fixture(()=>envelope([{...row,images:[]}]))
 const incomplete = await provider.detail(row.lot_number,'1')
 assert.equal(incomplete?.id,'1:'+row.lot_number)
 assert.deepEqual(incomplete?.link_img_hd,[])
 assert.deepEqual(incomplete?.link_img_small,[row.thumb_url])
})

test('ATV and UTV models are now admitted without reopening marine or heavy-equipment models', () => {
 assert.equal(isEridanRoadModel('SXS1000','HONDA'),true)
 assert.equal(isEridanRoadModel('TALON','HONDA'),true)
 assert.equal(isEridanRoadModel('TALON','EAGLE'),true)
 assert.equal(isEridanRoadModel('CBR600RR','HONDA'),true)
 assert.equal(isEridanRoadModel('YZF R1','YAMAHA'),true)
 assert.equal(isEridanRoadModel('YFM700','YAMAHA'),true)
})


test('independent catalogue streams overlap with bounded concurrency and preserve merged ordering', {timeout:2000}, async () => {
 let active=0,peak=0,calls=0,release!:()=>void
 const gate=new Promise<void>(resolve=>{release=resolve})
 const provider=createEridanProvider(async(path,params)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  if(path==='/fuel_types')return ['GAS','Gasoline']
  calls++;active++;peak=Math.max(peak,active)
  if(active===2)release()
  await gate
  await new Promise(resolve=>setTimeout(resolve,5))
  active--
  const motorcycle=params.get('item_type')==='VEHTYPE_M'
  const id=motorcycle?50:40
  return envelope([{...row,id,lot_number:String(73000000+id),item_type:motorcycle?'VEHTYPE_M':'VEHTYPE_V',model:{id:1,name:motorcycle?'S 1000':'X5'}}])
 })
 const result=await provider.search(new URLSearchParams('site=1&fuel=Gasoline'))
 assert.equal(peak,2);assert.equal(calls,12);assert.equal(active,0)
 assert.deepEqual(result.items.map(car=>car.lot_id),[73000050,73000040])
})
test('failed parallel stream rejects the search and stops scheduling remaining streams', async () => {
 let calls=0
 const provider=createEridanProvider(async(path)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  if(path==='/fuel_types')return ['GAS','Gasoline','Gas ']
  calls++
  if(calls===1)throw new Error('Auction provider HTTP 429')
  await new Promise(resolve=>setTimeout(resolve,10))
  return envelope([])
 })
 await assert.rejects(()=>provider.search(new URLSearchParams('site=1,2&fuel=Gasoline')),/429/)
 assert.equal(calls,2)
})
test('missing current bids never borrow buy-now or final prices, while real zero and positive bids survive', () => {
 assert.equal(normalizeEridanCar({...row,current_bid:null,buy_now_price:9000,final_bid:7000})?.current_bid,undefined)
 assert.equal(normalizeEridanCar({...row,current_bid:0})?.current_bid,0)
 assert.equal(normalizeEridanCar({...row,current_bid:550})?.current_bid,550)
})

test('a newer Copart import cannot hide IAAI, and unequal auction pools paginate without gaps', async()=>{
 const rows=[
  ...Array.from({length:35},(_,i)=>({...row,id:9000+i,lot_number:String(75000000+i),auction:'copart'})),
  ...Array.from({length:10},(_,i)=>({...row,id:100+i,lot_number:String(76000000+i),auction:'iaai'})),
 ]
 const provider=createEridanProvider(async(path,params)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  const matches=rows.filter(row=>row.auction===params.get('auction')).sort((a,b)=>b.id-a.id)
  const page=Number(params.get('page')),size=Math.min(10,Number(params.get('page_size')))
  return envelope(matches.slice((page-1)*size,page*size),page,page*size<matches.length,size)
 })
 const pages=[]
 for(const page of [1,2,3,4])pages.push(await provider.search(new URLSearchParams({site:'1,2',size:'6',page:String(page),vehicle_type:'Automobile'})))
 assert.deepEqual(pages.map(page=>page.items.length),[12,12,12,9])
 assert.deepEqual(pages.map(page=>page.hasNext),[true,true,true,false])
 assert.deepEqual(pages[0].items.map(car=>car.site),[1,2,1,2,1,2,1,2,1,2,1,2])
 const all=pages.flatMap(page=>page.items)
 assert.equal(new Set(all.map(car=>car.id)).size,45)
 assert.deepEqual(all.filter(car=>car.site===1).map(car=>car.lot_id),rows.filter(row=>row.auction==='copart').sort((a,b)=>b.id-a.id).map(row=>Number(row.lot_number)))
 assert.equal(all.filter(car=>car.site===2).length,10)
 const iaai=await provider.search(new URLSearchParams('site=2&size=6&vehicle_type=Automobile'))
 assert.ok(iaai.items.every(car=>car.site===2))
 assert.equal(iaai.items.length,6)
})

test('dense non-road motorcycle rows use one bounded larger page per auction',async()=>{
 let calls=0
 const provider=createEridanProvider(async(path,params)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  calls++
  if(params.get('item_type')==='VEHTYPE_A')return envelope([])
  const bike=params.get('item_type')==='VEHTYPE_M',site=params.get('auction')!
  const junk=Array.from({length:55},(_,i)=>({...row,id:9000-i,lot_number:String(90000000+i),auction:site,item_type:'VEHTYPE_M',make:{name:'YAMAHA'},model:{name:'WAVERUNNER'}}))
  const valid=Array.from({length:30},(_,i)=>({...row,id:8000-i,lot_number:String((site==='copart'?71000000:81000000)+(bike?100:0)+i),auction:site,item_type:bike?'VEHTYPE_M':'VEHTYPE_V',model:{name:bike?'S 1000':'X5'}}))
  const all=bike?[...junk,...valid]:valid
  const page=Number(params.get('page')),size=Number(params.get('page_size'))
  if(bike)assert.equal(size,100)
  return envelope(all.slice((page-1)*size,page*size),page,page*size<all.length,size)
 })
 const data=await provider.search(new URLSearchParams('site=1,2&size=12'))
 assert.equal(calls,12)
 assert.equal(data.items.length,24)
 assert.deepEqual(data.items.map(c=>c.site),Array.from({length:24},(_,i)=>i%2+1))
 assert.ok(data.items.every(c=>c.model!=='WAVERUNNER'))
})

test('fuel choices are auction-scoped and padded aliases do not multiply Copart requests',async()=>{
 const calls:{path:string;params:URLSearchParams}[]=[]
 const provider=createEridanProvider(async(path,params)=>{
  calls.push({path,params:new URLSearchParams(params)})
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  if(path==='/models')return {items:[{id:10,name:'3 SERIES',make_id:1}],count:1}
  if(path==='/fuel_types'){
   assert.ok(['copart','iaai'].includes(params.get('auction')!))
   return params.get('auction')==='copart'?['Gas','GAS','GAS                           ']:['Gasoline','Gasoline ']
  }
  const auction=params.get('auction'),fuel=params.get('fuel_type__name')
  assert.equal(fuel,auction==='copart'?'GAS':'Gasoline')
  const items=params.get('item_type')==='VEHTYPE_V'?[{...row,auction,lot_number:auction==='copart'?'70000001':'70000002',fuel}]:[]
  return envelope(items,Number(params.get('page')),false)
 })
 for(const site of ['1,2','2','1']){
  const data=await provider.search(new URLSearchParams({make:'BMW',model:'3 SERIES',year_from:'2013',fuel:'Gasoline',site}))
  assert.deepEqual(data.items.map(c=>c.site),site.split(',').map(Number))
 }
 assert.equal(calls.filter(c=>c.path==='/lots').length,16)
 assert.equal(calls.length,22)
})
test('a fuel absent from one auction does not block valid results from the other',async()=>{
 const provider=createEridanProvider(async(path,params)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  if(path==='/fuel_types')return params.get('auction')==='copart'?['GAS']:['Diesel']
  assert.equal(params.get('auction'),'copart')
  return envelope([{...row,fuel:'GAS'}],Number(params.get('page')),false)
 })
 const data=await provider.search(new URLSearchParams('site=1,2&fuel=Gasoline&vehicle_type=Automobile'))
 assert.deepEqual(data.items.map(c=>c.site),[1])
 await assert.rejects(()=>provider.search(new URLSearchParams('site=2&fuel=Gasoline')),UnsupportedEridanFilterError)
})

test('the user-provided JSON maps sale_date, auction, amounts, nested names and nulls without invented data', () => {
 const car = normalizeEridanCar(userLot)!
 assert.equal(car.id, '1:68880346'); assert.equal(car.lot_id, 68880346)
 assert.equal(car.auction_date, '2026-10-16T18:00:00Z'); assert.equal(car.auction_status, 'active')
 assert.equal(car.status, 'Run & Drive'); assert.equal(car.fuel, 'Gasoline')
 assert.equal(car.make, 'FORD'); assert.equal(car.model, 'F550')
 assert.equal(car.current_bid, undefined); assert.equal(car.buy_now, 7500)
 assert.equal(car.price_new, 28872); assert.equal(car.currency, 'USD')
 assert.equal(car.odometer, 56683); assert.equal(car.odometer_unit, 'unknown')
 assert.equal(car.damage_pr, 'SIDE'); assert.equal(car.damage_sec, undefined)
 assert.equal(car.document_old, 'SALVAGE CERTIFICATE UT')
 assert.equal(car.seller, undefined); assert.equal(car.seller_type, car.seller ? 'insurance' : 'dealer')
 assert.equal(car.vehicle_type, undefined) // VEHTYPE_R is not an allowed road-car category.
 assert.deepEqual(car.link_img_hd, []); assert.deepEqual(car.link_img_small, [userLot.thumb_url])
 const schedule = auctionSchedule(parseAuctionDate(car.auction_date), Date.parse('2026-10-13T12:00:00Z'), car.auction_status)
 assert.equal(userLot.is_future_sale, false)
 assert.equal(schedule.state, 'upcoming'); assert.equal(schedule.time, '21:00')
})

test('history is excluded from every catalogue stream, even if upstream ignores the active filter', async () => {
 const {provider,calls}=fixture(() => envelope([{...row,id:99,lot_number:'70000099',status:'not_sold'},row,userLot]))
 const data=await provider.search(new URLSearchParams({site:'1',make:'BMW'}))
 assert.deepEqual(data.items.map(car=>car.id), ['1:70000001'])
 assert.ok(calls.filter(call=>call.path==='/lots').every(call=>call.params.get('status')==='active'))
})

test('detail uses one supplied sale and does not retry a different status or date after an error', async () => {
 const {provider,calls}=fixture(()=>envelope([{...row,sale_date:'2030-10-14T14:00:00Z'}]))
 assert.equal((await provider.detail('70000001','1'))?.auction_date,'2030-10-14T14:00:00Z')
 assert.equal(calls.length,1); assert.equal(calls[0].params.has('status'),false)
 let errors=0
 const failed=createEridanProvider(async()=>{errors++;throw new Error('Auction provider HTTP 503')})
 await assert.rejects(()=>failed.detail('70000001','1'),/503/)
 assert.equal(errors,1)
})

test('expired unsold detail is retained as archive without a replacement-date query', async () => {
 const {provider,calls}=fixture(()=>envelope([{...row,status:'not_sold',sale_date:'2026-09-23T14:00:00Z'}]))
 const car=await provider.detail('70000001','1')
 assert.equal(car?.auction_status,'not_sold'); assert.equal(car?.current_bid,undefined)
 assert.equal(calls.length,1); assert.equal(calls[0].params.has('status'),false)
})

test('historical-only VIN and lot searches reject even if upstream ignores the active filter', async () => {
 for(const query of [row.vin,'70000001']){
  const {provider,calls}=fixture(()=>envelope([{...row,status:'not_sold'},{...row,status:'sold'}]))
  await assert.rejects(()=>provider.lookup(query),/not found/)
  assert.equal(calls.length,query===row.vin?1:2)
  assert.ok(calls.every(call=>call.params.get('status')==='active'))
 }
})

test('an active event without a supplied sale date remains available', async () => {
 const {provider}=fixture(()=>envelope([{...row,sale_date:null,status:'active'}]))
 const car=await provider.detail('70000001','1')
 assert.equal(car?.auction_status,'active')
 assert.equal(car?.auction_date,undefined)
 assert.deepEqual(await provider.lookup(row.vin),{lot:'70000001',site:'1'})
})

test('VIN and numeric lookup resolve only active events across both auctions', async () => {
 const vin=fixture((_,params)=>envelope(params.get('status')==='active'?[{...row,lot_number:'70000002'}]:[row]))
 assert.deepEqual(await vin.provider.lookup(row.vin),{lot:'70000002',site:'1'})
 assert.equal(vin.calls[0].params.get('status'),'active')
 const numeric=fixture((_,params)=>envelope(params.get('auction')==='iaai'?[{...row,auction:'iaai'}]:params.get('status')==='active'?[]:[{...row,status:'not_sold'}]))
 assert.deepEqual(await numeric.provider.lookup('70000001'),{lot:'70000001',site:'2'})
 assert.equal(numeric.calls.length,2)
})

test('ATV and UTV share the verified ATV category, while Utility trucks, RVs and watercraft stay excluded', async () => {
 const quad={...row,id:501,lot_number:'81500001',item_type:'VEHTYPE_A',make:{name:'POLARIS'},model:{name:'SPORTSMAN 570'}}
 const utv={...row,id:502,lot_number:'81500002',item_type:'VEHTYPE_A',make:{name:'CF MOTO'},model:{name:'UFORCE 1000'}}
 const rejected=[
  {...row,id:503,lot_number:'81500003',item_type:'VEHTYPE_U',make:{name:'FREIGHTLINER'},model:{name:'CASCADIA'}},
  {...userLot,id:504,lot_number:'81500004',images:row.images},
  {...row,id:505,lot_number:'81500005',item_type:'VEHTYPE_J',make:{name:'YAMAHA'},model:{name:'WAVERUNNER'}},
  {...row,id:506,lot_number:'81500006',item_type:'VEHTYPE_S',make:{name:'POLARIS'},model:{name:'RMK'}},
 ]
 const {provider,calls}=fixture(()=>envelope([quad,utv,...rejected]))
 const data=await provider.search(new URLSearchParams('vehicle_type=ATVUTV&site=1'))
 assert.deepEqual(data.items.map(car=>car.id),['1:81500002','1:81500001'])
 assert.ok(data.items.every(car=>car.vehicle_type==='ATVUTV'))
 assert.ok(calls.filter(call=>call.path==='/lots').every(call=>call.params.get('item_type')==='VEHTYPE_A'))
})
test('seller text is preserved and the explicit site category follows trimmed seller presence', () => {
 assert.equal(normalizeEridanCar({...row,seller:'  Example Insurance Company  '})?.seller,'Example Insurance Company')
 assert.equal(normalizeEridanCar({...row,seller:'  '})?.seller,undefined)
 assert.equal(normalizeEridanCar({...row,seller:null})?.seller,undefined)
 assert.equal(normalizeEridanCar({...row,seller:'Example Insurance Company'})?.seller_type,'insurance')
})

test('highlight programs remain distinct and enhanced never implies a running engine', () => {
 for(const [highlights,expected] of [
  [['AUTOCHECK','RUNS AND DRIVES','CERT-D','IV'],'Run & Drive'],
  [['ENGINE START PROGRAM','AUTOCHECK','CERT-S','IV'],'Starts'],
  [['ENHANCED VEHICLES','CERT-E','IV'],undefined],
 ] as [string[],string|undefined][]) assert.equal(normalizeEridanCar({...row,highlights})?.status,expected)
 const enhanced=normalizeEridanCar({...row,highlights:['ENHANCED VEHICLES','RUNS AND DRIVES']})!
 assert.equal(enhanced.enhanced,true); assert.equal(enhanced.status,'Run & Drive')
 assert.equal(normalizeEridanCar({...row,highlights:['CERT-E','IV']})?.enhanced,false)
 for(const buy_now_price of [null,0,-1,'', 'invalid']) assert.equal(normalizeEridanCar({...row,buy_now_price})?.buy_now,undefined)
 assert.equal(normalizeEridanCar({...row,buy_now_price:12345,currency:'CAD'})?.buy_now,12345)
 assert.equal(normalizeEridanCar({...row,status:'sold'})?.buy_now,undefined)
})

test('condition and seller filtering scan beyond nonmatching API pages before mixed pagination', async () => {
 const rows=Array.from({length:2040},(_,i)=>({...row,id:10000-i,lot_number:String(71000000+i),
  auction:i%2?'iaai':'copart',highlights:i<2000?['ENGINE START PROGRAM']:['RUNS AND DRIVES'],
  seller:i<2000?'Other company':'Example Insurance'}))
 const {provider,calls}=fixture((_,p)=>{
  assert.equal(p.get('status'),'active')
  assert.equal(p.has('highlights'),false); assert.equal(p.has('seller'),false)
  const all=rows.filter(r=>r.auction===p.get('auction'))
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(all.slice((page-1)*size,page*size),page,page*size<all.length,size)
 })
 const query={site:'1,2',size:'6',make:'BMW',vehicle_type:'Automobile',status:'Run & Drive',seller:'example'}
 const first=await provider.search(new URLSearchParams(query))
 const second=await provider.search(new URLSearchParams({...query,page:'2'}))
 assert.equal(first.items.length,12); assert.equal(first.hasNext,true)
 assert.equal(second.items.length,12)
 assert.ok([...first.items,...second.items].every(c=>c.status==='Run & Drive'&&c.seller==='Example Insurance'))
 assert.equal(new Set([...first.items,...second.items].map(c=>c.id)).size,24)
 assert.deepEqual(first.items.map(c=>c.site),Array.from({length:12},(_,i)=>i%2+1))
 assert.ok(calls.some(c=>c.params.get('page')==='2'))
})

test('enhanced filter is independent of mechanical condition and missing seller never matches', async()=>{
 const {provider}=fixture(()=>envelope([
  {...row,id:43,lot_number:'70000002',highlights:['ENHANCED VEHICLES','CERT-E'],seller:''},
  {...row,id:44,lot_number:'70000003',highlights:['ENGINE START PROGRAM'],seller:'Example'},
  row]))
 const enhanced=await provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile',status:'Enhanced Vehicles'}))
 assert.deepEqual(enhanced.items.map(c=>c.lot_id),[70000002])
 assert.equal(enhanced.items[0].status,undefined)
 const starts=await provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile',status:'Starts'}))
 assert.deepEqual(starts.items.map(c=>c.lot_id),[70000003])
 const combined=await provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile',status:'Enhanced Vehicles',seller:'Example'}))
 assert.equal(combined.items.length,0)
})

test('exhausting the scan budget reports a limit instead of empty or partial results',async()=>{
 const {provider,calls}=fixture((_,p)=>envelope([{...row,id:Number(p.get('page')),highlights:['ENGINE START PROGRAM']}],Number(p.get('page')),true,100))
 await assert.rejects(()=>provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile',status:'Run & Drive'})),EridanSearchLimitError)
 assert.equal(calls.filter(c=>c.path==='/lots').length,16)
})

test('archive includes expired active and unsold events but never future active cars',async()=>{
 const {provider,calls}=fixture(()=>envelope([
  {...row,id:80,lot_number:'70000080',status:'sold',sale_date:'2026-10-12T14:00:00Z'},row,
  {...row,id:81,lot_number:'70000081',status:'not_sold',sale_date:'2026-10-12T14:00:00Z'},
  {...row,id:82,lot_number:'70000082',status:'active',sale_date:'2026-10-12T14:00:00Z'}]))
 const archive=await provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile',archive:'ended'}))
 assert.deepEqual(archive.items.map(c=>c.lot_id),[70000082,70000081,70000080])
 assert.ok(archive.items.every(c=>c.current_bid===undefined&&c.buy_now===undefined))
 assert.ok(calls.filter(c=>c.path==='/lots').every(c=>c.params.has('sale_date__lte')&&!c.params.has('status')))
 const current=await provider.search(new URLSearchParams({site:'1',vehicle_type:'Automobile'}))
 assert.deepEqual(current.items.map(c=>c.lot_id),[Number(row.lot_number)])
})

test('sold and expired active details are returned without looking for a replacement date',async()=>{
 for(const status of ['sold','active','not_sold']){
  const {provider,calls}=fixture(()=>envelope([{...row,status,sale_date:'2026-10-12T19:00:00Z'}]))
  const car=await provider.detail('70000001','1')
  assert.equal(car?.auction_status,status)
  assert.equal(car?.current_bid,undefined); assert.equal(car?.buy_now,undefined)
  assert.equal(calls.length,1)
 }
})

test('archive VIN and lot lookup can resolve expired unsold events without mixing the active search',async()=>{
 for(const query of [row.vin,'70000001']){
  const {provider,calls}=fixture((_,p)=>envelope(p.get('status')==='active'?[]:[{...row,status:'not_sold',sale_date:'2026-10-12T19:00:00Z'}]))
  assert.deepEqual(await provider.lookup(query,'sold'),{lot:'70000001',site:'1'})
  assert.ok(calls.every(c=>!c.params.has('status')))
  await assert.rejects(()=>provider.lookup(query),/not found/)
 }
})

test('seller classification treats blanks as private and any populated name as insurance by site convention',()=>{
 for(const seller of ['', '   ', null, undefined]) {
  const car=normalizeEridanCar({...row,seller})!
  assert.equal(car.seller_type,'dealer')
  assert.equal(car.seller_type_source,'seller_presence')
  assert.equal(car.seller,undefined)
 }
 for(const seller of ['Acme Insurance','Named dealer',' Private seller ']) {
  const car=normalizeEridanCar({...row,seller})!
  assert.equal(car.seller_type,'insurance')
  assert.equal(car.seller_type_source,'seller_presence')
  assert.equal(car.seller,seller.trim())
 }
})

test('server date scopes skip dense expired imports but retain and paginate undated cars from both auctions',async()=>{
 const data=[
  ...Array.from({length:650},(_,i)=>({...row,id:10000+i,lot_number:String(88000000+i),sale_date:'2026-09-01T12:00:00Z'})),
  ...Array.from({length:40},(_,i)=>({...row,id:100+i,lot_number:String(87000000+i),auction:i%2?'iaai':'copart',sale_date:i%3===0?null:row.sale_date,seller:i%2?'Company':' '})),
 ]
 const queries:URLSearchParams[]=[]
 const provider=createEridanProvider(async(path,p)=>{
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  queries.push(new URLSearchParams(p))
  assert.ok(p.has('sale_date__gte')!==p.has('sale_date__isnull'))
  assert.equal(p.get('status'),'active')
  const matches=data.filter(c=>c.auction===p.get('auction')&&c.item_type===p.get('item_type')&&
   (p.has('sale_date__gte')?c.sale_date&&Date.parse(c.sale_date)>=Date.parse(p.get('sale_date__gte')!):c.sale_date===null)).sort((a,b)=>b.id-a.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(matches.slice((page-1)*size,page*size),page,page*size<matches.length,size)
 })
 const filter={make:'BMW',site:'1,2',size:'12',vehicle_type:'Automobile'}
 const first=await provider.search(new URLSearchParams(filter)),second=await provider.search(new URLSearchParams({...filter,page:'2'}))
 assert.deepEqual([first.items.length,second.items.length],[24,16])
 assert.deepEqual([first.hasNext,second.hasNext],[true,false])
 const all=[...first.items,...second.items]
 assert.equal(new Set(all.map(c=>c.id)).size,40)
 assert.equal(all.filter(c=>!c.auction_date).length,14)
 assert.ok(all.every(c=>!c.auction_date||Date.parse(c.auction_date)>Date.now()))
 assert.equal(queries.length,8)
 const privateCars=await provider.search(new URLSearchParams({...filter,seller_type:'dealer'}))
 assert.equal(privateCars.items.length,20)
 assert.ok(privateCars.items.every(c=>c.seller_type==='dealer'&&!c.seller))
 const insuranceCars=await provider.search(new URLSearchParams({...filter,seller_type:'insurance'}))
 assert.equal(insuranceCars.items.length,20)
 assert.ok(insuranceCars.items.every(c=>c.seller_type==='insurance'&&c.seller==='Company'))
 assert.ok(queries.every(p=>!p.has('seller_type')))
})

test('model families expand through documented model_ids before mixed pagination and preserve exact legacy selections',async()=>{
 const directory=[{id:11,name:'3 SERIES'},{id:12,name:'328I'},{id:13,name:'330'},{id:14,name:'M340I'},{id:15,name:'4 SERIES'},{id:16,name:'X3'}]
 const cars=Array.from({length:40},(_,i)=>({...row,id:1000+i,lot_number:String(91000000+i),auction:i%2?'iaai':'copart',model:directory[i%4]}))
 cars.push({...row,id:2000,lot_number:'92000000',auction:'copart',model:directory[4]})
 const queries:URLSearchParams[]=[]
 const provider=createEridanProvider(async(path,p)=>{
  if(path==='/models')return {items:directory,count:directory.length}
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
  queries.push(new URLSearchParams(p))
  const ids=p.get('model_ids')?.split(',').map(Number)
  const items=cars.filter(car=>car.auction===p.get('auction')&&car.item_type===p.get('item_type')&&p.get('sale_date__isnull')!=='true'&&(!ids||ids.includes(car.model.id))&&(!p.get('model__name')||car.model.name===p.get('model__name'))).sort((a,b)=>b.id-a.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(items.slice((page-1)*size,page*size),page,page*size<items.length,size)
 })
 assert.deepEqual(await provider.models!('BMW'),['3 SERIES','4 SERIES','X3'])
 const search=(page:number)=>provider.search(new URLSearchParams({make:'BMW',model:'3 SERIES',site:'1,2',page:String(page)}))
 const first=await search(1),second=await search(2)
 assert.equal(first.items.length,24);assert.equal(second.items.length,16)
 assert.equal(new Set([...first.items,...second.items].map(c=>c.id)).size,40)
 assert.deepEqual(new Set(first.items.map(c=>c.site)),new Set([1,2]))
 assert.ok(queries.every(p=>p.get('model_ids')==='11,12,13,14'&&!p.has('model__name')))
 const old=await provider.search(new URLSearchParams({make:'BMW',model:'328I',site:'1,2'}))
 assert.ok(old.items.length>0);assert.ok(old.items.every(c=>c.model==='328I'))
 assert.equal(queries.at(-1)!.get('model__name'),'328I')
})

test('explicit sorting merges all streams globally before paging, preserves filters and puts undated last',async()=>{
 const rows=Array.from({length:45},(_,i)=>({...row,id:1000+i,lot_number:String(91000000+i),auction:i%3?'iaai':'copart',year:2000+i%9,seller:i%4?'Insurer':'',sale_date:i>=42?null:new Date(Date.UTC(2032,0,1+Math.floor(i/2))).toISOString(),created_at:new Date(Date.UTC(2026,0,1+Math.floor((44-i)/2))).toISOString()}))
 const {provider,calls}=fixture((path,p)=>{
  assert.equal(path,'/lots')
  assert.equal(p.get('make__name'),'BMW')
  let eligible=rows.filter(r=>r.auction===p.get('auction')&&r.item_type===p.get('item_type')&&(!p.has('sale_date__gte')||r.sale_date&&Date.parse(r.sale_date)>=Date.parse(p.get('sale_date__gte')!))&&(p.get('sale_date__isnull')!=='true'||!r.sale_date))
  const fields=p.get('ordering')!.split(',')
  eligible.sort((a,b)=>{for(const field of fields){const key=field.replace(/^-/,'') as keyof typeof a;const av=a[key],bv=b[key];if(av===bv)continue;if(av==null)return 1;if(bv==null)return -1;return (av<bv?-1:1)*(field.startsWith('-')?-1:1)}return 0})
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(eligible.slice((page-1)*size,page*size),page,page*size<eligible.length,size)
 })
 for(const [sort,field,dir] of [['auction_soon','sale_date',1],['auction_late','sale_date',-1],['newest','created_at',-1],['year_asc','year',1],['year_desc','year',-1]] as const){
  const expected=rows.slice().sort((a,b)=>{const av=a[field],bv=b[field];if(av==null&&bv!=null)return 1;if(av!=null&&bv==null)return -1;return ((av===bv?0:av!<bv!?-1:1)||a.id-b.id)*dir}).map(r=>r.lot_number)
  const ids:string[]=[]
  for(let page=1;page<=4;page++){
   const result=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',page:String(page),sort}))
   ids.push(...result.items.map(c=>String(c.lot_id)))
   assert.equal(result.hasNext,page<4)
  }
  assert.deepEqual(ids,expected,sort)
  assert.equal(new Set(ids).size,45)
 }
 const filtered=await provider.search(new URLSearchParams({make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',sort:'auction_soon',seller_type:'insurance',status:'Run & Drive'}))
 assert.deepEqual(filtered.items.map(c=>c.lot_id),rows.filter(r=>r.seller).slice(0,12).map(r=>Number(r.lot_number)))
 assert.ok(calls.filter(c=>c.path==='/lots').every(c=>c.params.get('ordering')!== '-id'))
})

test('category model lists use actual lots of shared brands, include later pages and reject mismatches',async()=>{
 const rows=[
 {...row,id:1,lot_number:'91000001',make:{id:3,name:'HONDA'},model:{id:1,name:'CIVIC EX'},item_type:'VEHTYPE_V'},
 {...row,id:2,lot_number:'91000002',make:{id:3,name:'HONDA'},model:{id:2,name:'CBR600RR'},item_type:'VEHTYPE_M'},
 {...row,id:3,lot_number:'91000003',make:{id:3,name:'HONDA'},model:{id:3,name:'CRF450R'},item_type:'VEHTYPE_M'},
 {...row,id:4,lot_number:'91000004',make:{id:3,name:'HONDA'},model:{id:4,name:'TRX420'},item_type:'VEHTYPE_A',sale_date:null}
 ]
 const {provider,calls}=fixture((path,p)=>{
  assert.equal(path,'/lots');assert.equal(p.get('make__name'),'HONDA')
  const eligible=rows.filter(r=>r.item_type===p.get('item_type')&&(p.get('sale_date__isnull')==='true'?!r.sale_date:Boolean(r.sale_date)))
  const page=Number(p.get('page'))
  return envelope(eligible.slice(page-1,page),page,page<eligible.length,1)
 })
 assert.deepEqual(await provider.models!('HONDA','Automobile'),['CIVIC'])
 assert.deepEqual(await provider.models!('HONDA','Motorcycle'),['CBR600RR','CRF450R'])
 assert.deepEqual(await provider.models!('HONDA','ATVUTV'),['TRX420'])
 assert.deepEqual(await provider.models!('HONDA','Powersports'),['CBR600RR','CRF450R','TRX420'])
 assert.deepEqual(await provider.models!('TOYOTA','Motorcycle'),[])
 await assert.rejects(provider.models!('HONDA','Boat'))
 assert.ok(calls.some(c=>c.path==='/lots'&&c.params.get('page')==='2'))
})

test('combined powersports scope never queries cars and merges both auctions before paging',async()=>{
 const rows=Array.from({length:30},(_,i)=>({...row,id:1000+i,lot_number:String(93000000+i),make:{id:3,name:'HONDA'},model:{id:30+i,name:i%2?'TRX420':'CBR600RR'},item_type:i%2?'VEHTYPE_A':'VEHTYPE_M',auction:i%3?'iaai':'copart'}))
 const {provider,calls}=fixture((path,p)=>{
  assert.equal(path,'/lots')
  assert.ok(['VEHTYPE_M','VEHTYPE_A'].includes(p.get('item_type')!))
  const items=rows.filter(r=>r.item_type===p.get('item_type')&&r.auction===p.get('auction')&&p.get('sale_date__isnull')!=='true').sort((a,b)=>b.id-a.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(items.slice((page-1)*size,page*size),page,page*size<items.length,size)
 })
 const query={vehicle_type:'Powersports',site:'1,2',sort:'newest',size:'6'}
 const all=[]
 for(let page=1;page<=3;page++){
  const data=await provider.search(new URLSearchParams({...query,page:String(page)}))
  all.push(...data.items)
  assert.equal(data.hasNext,page<3)
 }
 assert.equal(all.length,30)
 assert.equal(new Set(all.map(c=>c.id)).size,30)
 assert.deepEqual(new Set(all.map(c=>c.vehicle_type)),new Set(['Motorcycle','ATVUTV']))
 assert.deepEqual(new Set(all.map(c=>c.site)),new Set([1,2]))
 assert.ok(calls.filter(c=>c.path==='/lots').every(c=>!c.params.has('vehicle_type')))
})

test('seller selection needs no model when thousands of leading rows have empty sellers',async()=>{
 const rows=[
  ...Array.from({length:2500},(_,i)=>({...row,id:10000+i,lot_number:String(94000000+i),seller:''})),
  ...Array.from({length:70},(_,i)=>({...row,id:1000+i,lot_number:String(93000000+i),seller:'Example Company'})),
  ...Array.from({length:3500},(_,i)=>({...row,id:20000+i,lot_number:String(95000000+i),auction:'iaai',seller:i%2?'':'   '})),
 ]
 const {provider,calls}=fixture((path,p)=>{
  assert.equal(path,'/lots')
  assert.equal(p.has('model__name')||p.has('model_ids'),false)
  assert.equal(p.has('seller_type')||p.has('seller'),false)
  const items=rows.filter(r=>r.auction===p.get('auction')&&p.get('sale_date__isnull')!=='true').sort((a,b)=>b.id-a.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(items.slice((page-1)*size,page*size),page,page*size<items.length,size)
 })
 const query={make:'BMW',vehicle_type:'Automobile',site:'1,2',seller_type:'insurance',size:'12'}
 const found=[]
 for(let page=1;page<=3;page++){
  const before=calls.length
  const result=await provider.search(new URLSearchParams({...query,page:String(page)}))
  assert.equal(result.items.length,page===3?22:24)
  assert.equal(result.hasNext,page<3)
  assert.ok(calls.length-before<=11)
  found.push(...result.items)
 }
 assert.equal(new Set(found.map(c=>c.id)).size,70)
 assert.ok(found.every(c=>c.seller_type==='insurance'&&c.seller==='Example Company'))
 const privateCars=await provider.search(new URLSearchParams({...query,seller_type:'dealer'}))
 assert.equal(privateCars.items.length,24)
 assert.ok(privateCars.items.every(c=>c.seller_type==='dealer'&&!c.seller))
 assert.deepEqual(new Set(privateCars.items.map(c=>c.site)),new Set([1,2]))
})

test('cylinders uses only a valid explicit provider field, never engine text',()=>{
 for(const value of [6,'6',' 6 ','06','6 Cyl',' 6 CYL ','6 cyl'])assert.equal(normalizeEridanCar({...row,cylinders:value})?.cylinders,6)
 for(const value of [null,undefined,'',0,'0','unknown',6.5,'6e0',true,17,'0 Cyl','17 Cyl','V6','6 cylinders extra','6.5 Cyl','4-6 Cyl'])assert.equal(normalizeEridanCar({...row,engine:'V8',cylinders:value})?.cylinders,undefined)
})
test('cylinder filtering fills mixed-auction pages before slicing and preserves sort/condition/seller filters',async()=>{
 const data=Array.from({length:90},(_,i)=>({...row,id:5000+i,lot_number:String(98000000+i),auction:i%2?'iaai':'copart',cylinders:i%3===0?(i%2?'6 Cyl':' 6 '):i%3===1?'4':null}))
 const {provider,calls}=fixture((path,p)=>{
  assert.equal(path,'/lots')
  assert.equal(p.has('cylinders'),false)
  const selected=p.get('sale_date__isnull')==='true'?[]:data.filter(car=>car.auction===p.get('auction'))
  selected.sort((a,b)=>p.get('ordering')!.startsWith('-')?b.id-a.id:a.id-b.id)
  const page=Number(p.get('page')),size=7
  return envelope(selected.slice((page-1)*size,page*size),page,page*size<selected.length,size)
 })
 const filters={make:'BMW',vehicle_type:'Automobile',site:'1,2',size:'6',cylinders:'6',status:'Run & Drive',seller_type:'insurance',sort:'auction_soon'}
 const pages=[]
 for(const page of [1,2,3])pages.push(await provider.search(new URLSearchParams({...filters,page:String(page)})))
 assert.deepEqual(pages.map(p=>p.items.length),[12,12,6])
 assert.deepEqual(pages.map(p=>p.hasNext),[true,true,false])
 const cars=pages.flatMap(p=>p.items)
 assert.equal(new Set(cars.map(car=>car.id)).size,30)
 assert.ok(cars.every(car=>car.cylinders===6&&car.status==='Run & Drive'&&car.seller_type==='insurance'))
 assert.deepEqual(new Set(cars.map(car=>car.site)),new Set([1,2]))
 assert.ok(calls.filter(call=>call.path==='/lots').every(call=>call.params.get('page_size')==='1000'))
})
test('cylinder-only searches need no make/model and work in powersports and archives',async()=>{
 for(const [type,code,make,model] of [['Automobile','VEHTYPE_V','BMW','X5'],['Motorcycle','VEHTYPE_M','Honda','CBR600RR'],['ATVUTV','VEHTYPE_A','POLARIS','SPORTSMAN 570']]){
  for(const archive of ['', 'ended']){
   const {provider}=fixture((path,p)=>envelope(p.get('sale_date__isnull')==='true'?[]:[
    {...row,item_type:code,make:{id:1,name:make},model:{id:10,name:model},cylinders:'4 Cyl',...(archive?{status:'sold',sale_date:'2020-01-01T00:00:00Z'}:{})},
    {...row,id:43,lot_number:'70000002',item_type:code,make:{id:1,name:make},model:{id:10,name:model},cylinders:null,engine:'4 CYL',...(archive?{status:'sold',sale_date:'2020-01-01T00:00:00Z'}:{})}
   ],Number(p.get('page'))))
   const result=await provider.search(new URLSearchParams({vehicle_type:type,site:'1',cylinders:'4',archive}))
   assert.equal(result.items.length,1);assert.equal(result.items[0].cylinders,4)
  }
 }
})

test('Renegade family searches all CAN-AM spelling variants before paginating ATV results',async()=>{
 const names=['RENEGADE','RENEGADE X','RENEGADE 570','RENEGADE X MR 650','RENEGADE X XC 1000R']
 const models=names.map((name,i)=>({id:100+i,name}))
 const aliases=['CAN-AM','CAN AM','CANAM']
 const rows=Array.from({length:40},(_,i)=>({...row,id:5000+i,lot_number:String(97000000+i),auction:i%2?'iaai':'copart',make:{id:90+i%3,name:aliases[i%3]},model:models[i%5],item_type:'VEHTYPE_A'}))
 const {provider,calls}=fixture((path,p)=>{
  if(path==='/models')return {items:models.filter((_,i)=>aliases[i%3]===p.get('make__name')),count:models.filter((_,i)=>aliases[i%3]===p.get('make__name')).length}
  assert.equal(path,'/lots')
  assert.equal(p.get('makes'),'CAN-AM,CAN AM,CANAM')
  assert.equal(p.get('make__name'),null)
  assert.equal(p.get('item_type'),'VEHTYPE_A')
  assert.equal(p.get('model__name'),null)
  assert.deepEqual(p.get('model_ids')!.split(',').map(Number).sort(),models.map(m=>m.id).sort())
  const eligible=rows.filter(r=>r.auction===p.get('auction')&&p.get('sale_date__isnull')!=='true').sort((a,b)=>a.id-b.id)
  const page=Number(p.get('page')),size=Number(p.get('page_size'))
  return envelope(eligible.slice((page-1)*size,page*size),page,page*size<eligible.length,size)
 })
 const results=[]
 for(const page of ['1','2'])results.push(...(await provider.search(new URLSearchParams({make:'CAN-AM',model:'RENEGADE',vehicle_type:'ATVUTV',site:'1,2',sort:'auction_soon',page}))).items)
 assert.equal(results.length,40)
 assert.equal(new Set(results.map(r=>r.id)).size,40)
 assert.deepEqual(new Set(results.map(r=>r.model)),new Set(names))
 assert.equal(calls.filter(c=>c.path==='/models').length,3)
})
