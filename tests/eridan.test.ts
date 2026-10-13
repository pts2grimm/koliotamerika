import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEridanProvider, normalizeEridanCar, UnsupportedEridanFilterError } from '../src/lib/auction-providers/eridan'
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
 assert.equal(car.seller_type, undefined); assert.equal(car.odometer_unit, 'unknown')
 assert.equal(normalizeEridanCar({ ...row, auction: 'iaai' })?.id, '2:70000001')
 assert.equal(normalizeEridanCar({ ...row, auction: 'unknown' }), undefined)
 assert.equal(normalizeEridanCar({ ...row, lot_number: undefined }), undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: null })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: '' })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, current_bid: -1 })?.current_bid, undefined)
 assert.equal(normalizeEridanCar({ ...row, currency: 'UNKNOWN' })?.current_bid, undefined)
})
test('Eridan does not confuse auction status with mechanical condition or infer seller category', () => {
 const car = normalizeEridanCar({ ...row, status: 'sold', highlights: [] })!
 assert.equal(car.status, undefined); assert.equal(car.seller_type, undefined)
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
 assert.equal(query.get('make__name'), 'BMW'); assert.equal(query.get('model__name'), 'X5')
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
test('unsupported mechanical/seller/cylinder filters fail explicitly before any paid request', async () => {
 for (const [key, value] of [['status', 'Run & Drive'], ['seller_type', 'insurance'], ['cylinders', '6']]) {
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
 assert.equal(calls[0].params.get('status'), 'active'); assert.equal(calls[0].params.get('ordering'), '-sale_date'); assert.equal(calls[0].params.get('lot_number'), '70000001'); assert.equal(calls[0].params.get('auction'), 'copart')
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
 assert.deepEqual(calls, ['HYBRID ENGINE', 'ELECTRIC AND GAS HYBRID', 'Hybrid'])
 calls.length = 0
 await provider.search(new URLSearchParams('fuel=Electric&vehicle_type=Automobile'))
 assert.deepEqual(calls, ['Electric', 'ELECTRIC VEHICLE'])
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
 assert.equal(peak,2);assert.equal(calls,6);assert.equal(active,0)
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
 assert.equal(calls,6)
 assert.equal(data.items.length,24)
 assert.deepEqual(data.items.map(c=>c.site),Array.from({length:24},(_,i)=>i%2+1))
 assert.ok(data.items.every(c=>c.model!=='WAVERUNNER'))
})

test('fuel choices are auction-scoped and padded aliases do not multiply Copart requests',async()=>{
 const calls:{path:string;params:URLSearchParams}[]=[]
 const provider=createEridanProvider(async(path,params)=>{
  calls.push({path,params:new URLSearchParams(params)})
  if(path==='/item_types')return [{value:'VEHTYPE_V',label:'Vehicle'},{value:'VEHTYPE_M',label:'Motorcycle'},{value:'VEHTYPE_A',label:'ATV'}]
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
 assert.equal(calls.filter(c=>c.path==='/lots').length,8)
 assert.equal(calls.length,13)
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
 assert.equal(car.seller, undefined); assert.equal(car.seller_type, undefined)
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

test('detail prefers the active sale to recently reimported history and never falls back after an API error', async () => {
 const {provider,calls}=fixture((_,params)=>envelope(params.get('status')==='active'?[{...row,sale_date:'2026-10-14T14:00:00Z'}]:[{...row,status:'not_sold',sale_date:'2026-09-23T14:00:00Z'}]))
 assert.equal((await provider.detail('70000001','1'))?.auction_date,'2026-10-14T14:00:00Z')
 assert.equal(calls.length,1)
 let errors=0
 const failed=createEridanProvider(async()=>{errors++;throw new Error('Auction provider HTTP 503')})
 await assert.rejects(()=>failed.detail('70000001','1'),/503/)
 assert.equal(errors,1)
})

test('historical-only details are unavailable and never trigger an unfiltered fallback', async () => {
 const {provider,calls}=fixture((_,params)=>envelope(params.get('status')==='active'?[]:[{...row,status:'not_sold',sale_date:'2026-09-23T14:00:00Z'}]))
 assert.equal(await provider.detail('70000001','1'),undefined)
 assert.equal(calls.length,1)
 assert.equal(calls[0].params.get('status'),'active')
 const ignored=fixture(()=>envelope([{...row,status:'not_sold'}]))
 assert.equal(await ignored.provider.detail('70000001','1'),undefined)
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
test('seller is preserved when populated, omitted when empty, and never inferred as an insurer', () => {
 assert.equal(normalizeEridanCar({...row,seller:'  Example Insurance Company  '})?.seller,'Example Insurance Company')
 assert.equal(normalizeEridanCar({...row,seller:'  '})?.seller,undefined)
 assert.equal(normalizeEridanCar({...row,seller:null})?.seller,undefined)
 assert.equal(normalizeEridanCar({...row,seller:'Example Insurance Company'})?.seller_type,undefined)
})
