import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEridanProvider, normalizeEridanCar, UnsupportedEridanFilterError } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { mileage } from '../src/lib/vehicle-details'
import type { AuctionTransport } from '../src/lib/auction-providers/types'

const row = {
 id: 42, lot_number: '70000001', auction: 'copart', name: '2023 BMW X5',
 make: { id: 1, name: 'BMW' }, model: { id: 10, name: 'X5', make_id: 1 }, year: 2023,
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
  if (path === '/item_types') return [{ value: 'VEHTYPE_V', label: 'Vehicle' }]
  if (path === '/fuel_types') return ['GAS', 'DIESEL', 'HYBRID ENGINE', 'ELECTRIC']
  return answer ? answer(path, params) : envelope([row], Number(params.get('page') || 1), true)
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
 assert.equal(query.get('year_from'), '2020'); assert.equal(query.get('year_to'), '2024')
 assert.equal(query.get('item_type'), 'VEHTYPE_V')
 assert.equal(query.get('page_size'), '24'); assert.equal(query.get('page'), '2'); assert.equal(query.get('auction'), null)
 assert.equal(data.total, null); assert.equal(data.totalPages, null); assert.equal(data.hasNext, true)
})
test('single auction query is scoped, with no unsupported parameters leaked to Eridan', async () => {
 const { provider, calls } = fixture()
 await provider.search(new URLSearchParams({ site: '2', size: '12', made_up: 'ignored' }))
 const params = calls[0].params
 assert.equal(params.get('auction'), 'iaai'); assert.equal(params.get('page_size'), '12'); assert.equal(params.get('made_up'), null)
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
 assert.equal(calls[0].params.get('lot_number'), '70000001'); assert.equal(calls[0].params.get('auction'), 'copart')
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
test('directories join models by make_id and fetch all pages when upstream clamps page_size', async () => {
 const { provider, calls } = fixture((path, params) => {
  const second = params.get('page') === '2'
  if (path === '/makes') return { items: [second ? { id: 2, name: 'Ford' } : { id: 1, name: 'BMW' }], count: 2 }
  return { items: [second ? { id: 20, name: 'Mustang', make_id: 2 } : { id: 10, name: 'X5', make_id: 1 }], count: 2 }
 })
 const map = await provider.makes()
 assert.deepEqual({ ...map }, { BMW: ['X5'], Ford: ['Mustang'] }); assert.equal(calls.length, 4)
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
test('transport enforces a per-process budget without automatic retries or secret-bearing network errors', async () => {
 let calls = 0, time = 1000000
 const request = createEridanTransport({ apiKey: 'test-key', now: () => time, fetch: async () => {
  calls++; return { ok: true, status: 200, json: async () => ({}) }
 } })
 for (let i = 0; i < 20; i++) await request('/lots', new URLSearchParams())
 await assert.rejects(() => request('/lots', new URLSearchParams()), /budget/); assert.equal(calls, 20)
 time += 60001; await request('/lots', new URLSearchParams()); assert.equal(calls, 21)
 const fail = createEridanTransport({ apiKey: 'test-key', fetch: async () => { throw new Error('private header content') } })
 await assert.rejects(() => fail('/lots', new URLSearchParams()), error => error instanceof Error && error.message === 'Eridan connection failed')
})

test('fuel aliases from both auctions merge before pagination, without duplicates, skips or invented totals', async () => {
 const data = Array.from({ length: 55 }, (_, i) => ({ ...row, id: 100 + i, lot_number: String(71000000 + i), auction: i % 2 ? 'iaai' : 'copart', fuel: i % 2 ? 'Gasoline' : 'GAS' }))
 const provider = createEridanProvider(async (path, params) => {
  if (path === '/fuel_types') return ['GAS', 'Gas', 'Gasoline']
  const fuel = params.get('fuel_type__name')!.toLowerCase()
  const matches = data.filter(item => item.fuel.toLowerCase() === fuel).sort((a, b) => b.id - a.id)
  const page = Number(params.get('page'))
  // Upstream clamps requested windows: the adapter must follow every stream correctly.
  const size = Math.min(10, Number(params.get('page_size')))
  return envelope(matches.slice((page - 1) * size, page * size), page, page * size < matches.length, size)
 })
 const pages = []
 for (const page of [1, 2, 3]) pages.push(await provider.search(new URLSearchParams({ site: '1,2', fuel: 'Gasoline', page: String(page), size: '12' })))
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
  if (path === '/fuel_types') return ['HYBRID ENGINE', 'ELECTRIC AND GAS HYBRID', 'Hybrid', 'Electric', 'ELECTRIC VEHICLE']
  calls.push(params.get('fuel_type__name')!)
  return envelope([], Number(params.get('page')), false, Number(params.get('page_size')))
 })
 await provider.search(new URLSearchParams('fuel=Hybrid'))
 assert.deepEqual(calls, ['HYBRID ENGINE', 'ELECTRIC AND GAS HYBRID', 'Hybrid'])
 calls.length = 0
 await provider.search(new URLSearchParams('fuel=Electric'))
 assert.deepEqual(calls, ['Electric', 'ELECTRIC VEHICLE'])
})
