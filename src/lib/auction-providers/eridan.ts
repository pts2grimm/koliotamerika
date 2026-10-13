import { canonicalEridanMake, eridanMakeAliases, eridanMakeParams, sameEridanMake } from './make-aliases'
import { auctionSort } from '../auction-sorting'
import { groupModelDirectory } from './model-families'
import { isAuctionClosed } from '../auction-lifecycle'
import type { AuctionCar, AuctionProvider, AuctionTransport } from './types'
import { record, validSearchParams } from './normalize'
import { eridanRoadBrands, eridanRoadTypes, eridanTypesForFilter, isEridanRoadMake, isEridanRoadModel, type EridanRoadType } from './eridan-scope'

// Eridan OpenAPI 2.0.0: /api/openapi.json. Its record id is NOT an auction lot number.
const fuelGroups: Record<string, string[]> = {
 Gasoline: ['gasoline', 'gas'], Diesel: ['diesel'],
 Hybrid: ['hybrid', 'hybrid engine', 'electric and gas hybrid', 'electric and diesel hybrid'],
 Electric: ['electric', 'electric vehicle'],
}
const auctions: Record<string, string> = { '1': 'copart', '2': 'iaai' }
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const number = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : undefined
const name = (value: unknown) => text(record(value).name)
const imageURLs = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => {
 if (typeof v !== 'string') return false
 try { const url = new URL(v); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}).slice(0, 40) : []

function mechanicalStatus(raw: Record<string, unknown>) {
 // "status" describes the auction lifecycle. Never label "sold"/"active" as mechanical condition.
 const highlights = Array.isArray(raw.highlights) ? raw.highlights : []
 for (const value of highlights) {
  if (typeof value !== 'string') continue
  if (/^runs?\s*(?:&|and)\s*drives?$/i.test(value.trim())) return 'Run & Drive'
  if (/^(?:engine\s*start(?:s|\s*program)?|starts)$/i.test(value.trim())) return 'Starts'
  if (/^stationary$/i.test(value.trim())) return 'Stationary'
 }
 return undefined
}

export function normalizeEridanCar(value: unknown): AuctionCar | undefined {
 const raw = record(value)
 const lotText = text(raw.lot_number), lot = number(lotText)
 const site = raw.auction === 'copart' ? 1 : raw.auction === 'iaai' ? 2 : 0
 if (!lotText || !/^\d{5,12}$/.test(lotText) || !Number.isSafeInteger(lot) || !lot || !site) return undefined
 const make = name(raw.make) || '', model = name(raw.model) || name(raw.series) || '', year = number(raw.year) || 0
 const currency = text(raw.currency)?.toUpperCase()
 const active = raw.status === 'active' && !isAuctionClosed({auction_status: text(raw.status), auction_date: text(raw.sale_date)})
 const knownCurrency = currency && ['USD', 'CAD', 'EUR', 'BGN'].includes(currency)
 // The current documented response does not specify odometer units. Do not assume US == miles.
 const unit = raw.odometer_unit === 'mi' || raw.odometer_unit === 'km' ? raw.odometer_unit : 'unknown'
 return {
  id: site + ':' + lot, lot_id: lot, site, title: text(raw.name) || [year || '', make, model].filter(Boolean).join(' '),
  make, model, year, vehicle_type: raw.item_type === 'VEHTYPE_V' ? 'Automobile' : raw.item_type === 'VEHTYPE_M' ? 'Motorcycle' : raw.item_type === 'VEHTYPE_A' ? 'ATVUTV' : undefined, vin: text(raw.vin), odometer: number(raw.odometer), odometer_unit: unit,
  currency, current_bid: knownCurrency && active ? number(raw.current_bid) : undefined,
  buy_now: knownCurrency && active && Number(raw.buy_now_price) > 0 ? number(raw.buy_now_price) : undefined, price_new: knownCurrency ? number(raw.retail_value) : undefined,
  location: [text(raw.city), text(raw.state)].filter(Boolean).join(', ') || text(raw.yard),
  state: text(raw.state), auction_date: text(raw.sale_date), auction_status: text(raw.status), status: mechanicalStatus(raw),
  enhanced: Array.isArray(raw.highlights) && raw.highlights.some(value => typeof value === 'string' && /^enhanced vehicles$/i.test(value.trim())),
  damage_pr: name(raw.primary_damage), damage_sec: name(raw.secondary_damage),
  document_old: [text(raw.title_type), text(raw.title_state)].filter(Boolean).join(' ') || undefined,
  fuel: Object.entries(fuelGroups).find(([, names]) => names.includes(text(raw.fuel)?.toLowerCase() || ''))?.[0] || text(raw.fuel), transmission: text(raw.transmission), engine: text(raw.engine), drive: text(raw.drive),
  seller: text(raw.seller), seller_type: text(raw.seller) ? 'insurance' : 'dealer', seller_type_source: 'seller_presence', link_img_hd: imageURLs(raw.images), link_img_small: imageURLs([raw.thumb_url]),
 }
}

export class UnsupportedEridanFilterError extends Error {
 constructor(readonly filters: string[]) { super('Eridan does not document these filters: ' + filters.join(', ')) }
}
export function unsupportedEridanFilters(input: URLSearchParams) {
 // Seller categories follow the site's explicit rule: named seller / empty seller.
 const unsupported = ['cylinders'].filter(key => Boolean(input.get(key)?.trim()))
 const sellerType = input.get('seller_type')?.trim()
 if (sellerType && !['insurance', 'dealer'].includes(sellerType)) unsupported.push('seller_type')
 const condition = input.get('status')?.trim()
 if (condition && !['Run & Drive', 'Starts', 'Stationary', 'Enhanced Vehicles'].includes(condition)) unsupported.push('status')
 return unsupported
}
export class EridanSearchLimitError extends Error {
 constructor() { super('Eridan search scan limit reached; narrow the filters') }
}
function lots(raw: unknown, expectedPage: number) {
 const data = record(raw)
 if (!Array.isArray(data.items) || typeof data.has_next !== 'boolean' || data.page !== expectedPage || !Number.isInteger(data.page_size) || Number(data.page_size) < 1) throw new Error('Invalid Eridan catalogue response')
 const items = data.items.map(normalizeEridanCar)
 if (items.some(item => !item)) throw new Error('Invalid Eridan auction identity')
 return { items: items as AuctionCar[], hasNext: data.has_next, size: Number(data.page_size) }
}

export function createEridanProvider(request: AuctionTransport): AuctionProvider {
 const directory = async (path: string, filters: Record<string, string> = {}) => {
  const fetchPage = async (page: number) => {
   const raw = record(await request(path, new URLSearchParams({ ...filters, page: String(page), page_size: '1000', ordering: 'id' })))
   if (!Array.isArray(raw.items) || !Number.isInteger(raw.count) || Number(raw.count) < 0) throw new Error('Invalid Eridan directory')
   return { items: raw.items, count: Number(raw.count) }
  }
  const first = await fetchPage(1)
  if (!first.items.length) {
   if (first.count) throw new Error('Incomplete Eridan directory')
   return []
  }
  const pages = Math.ceil(first.count / first.items.length)
  if (pages > 100) throw new Error('Eridan directory page limit reached')
  const found = new Map<number, Record<string, unknown>>()
  const add = (items: unknown[]) => {
   for (const item of items) {
    const row = record(item)
    if (!Number.isSafeInteger(row.id) || typeof row.name !== 'string') throw new Error('Invalid Eridan directory item')
    found.set(Number(row.id), row)
   }
  }
  add(first.items)
  // Bounded concurrency avoids dozens of sequential round trips on a cold directory cache.
  for (let page = 2; page <= pages; page += 3) {
   const batch = await Promise.all(Array.from({ length: Math.min(3, pages - page + 1) }, (_, i) => fetchPage(page + i)))
   for (const part of batch) {
    if (part.count !== first.count) throw new Error('Eridan directory changed during pagination')
    add(part.items)
   }
  }
  if (found.size < first.count) throw new Error('Incomplete Eridan directory')
  return [...found.values()]
 }
 const modelGroups = new Map<string, Promise<Map<string, number[]>>>()
 const groupsFor = (make: string) => {
  const canonical = canonicalEridanMake(make), key = canonical.toUpperCase()
  // /models supports an exact make name, so union the complete directories.
  // The largest alias group has three members; failures must not produce partial models.
  if (!modelGroups.has(key)) modelGroups.set(key, Promise.all(eridanMakeAliases(make).map(alias => directory('/models', { make__name: alias }))).then(parts =>
   groupModelDirectory(canonical, parts.flat().map(row => ({ id: Number(row.id), name: String(row.name) })))
  ).catch(error => { modelGroups.delete(key); throw error }))
  return modelGroups.get(key)!
 }
 let categories: Promise<Record<EridanRoadType, string>> | undefined
 const categoryCodes = () => categories ||= (async () => {
  const raw = await request('/item_types', new URLSearchParams())
  if (!Array.isArray(raw)) throw new Error('Invalid Eridan vehicle types')
  const patterns = { Automobile: /^(?:vehicle|automobiles?|passenger vehicles?)$/i, Motorcycle: /^motorcycles?$/i, ATVUTV: /^ATV$/i }
  return Object.fromEntries(eridanRoadTypes.map(type => {
   const match = raw.map(record).find(row => patterns[type].test(text(row.label) || ''))
   if (!match || match.value !== ({ Automobile: 'VEHTYPE_V', Motorcycle: 'VEHTYPE_M', ATVUTV: 'VEHTYPE_A' }[type])) throw new Error('Eridan road category is not confirmed')
   return [type, String(match.value)]
  })) as Record<EridanRoadType, string>
 })().catch(error => { categories = undefined; throw error })
 const findLot = async (lot: string, site: string, lifecycle: 'active' | 'sold' = 'active') => {
  if (!/^\d{5,12}$/.test(lot) || !auctions[site]) throw new Error('Invalid lot')
  // A lot can have multiple sale events. Import time is not the auction date.
  const params = new URLSearchParams({ lot_number: lot, auction: auctions[site], ordering: '-sale_date', page: '1', page_size: '10', status: lifecycle })
  const data = lots(await request('/lots', params), 1)
  return data.items.find(car => car.lot_id === Number(lot) && String(car.site) === site && car.auction_status === lifecycle)
 }
 // Resolve the returned sale once. Never search for a replacement date after
 // an expired sale, including when the provider still calls it active.
 const detail = async (lot: string, site: string) => {
  if (!/^\d{5,12}$/.test(lot) || !auctions[site]) throw new Error('Invalid lot')
  const params = new URLSearchParams({lot_number: lot, auction: auctions[site], ordering: '-sale_date', page: '1', page_size: '10'})
  const data = lots(await request('/lots', params), 1)
  const latest = data.items.find(car => car.lot_id === Number(lot) && String(car.site) === site)
  return latest && (latest.auction_status === 'active' || isAuctionClosed(latest)) ? latest : undefined
 }
 return {
  name: 'eridan', detail,
  async search(input) {
   const unsupported = unsupportedEridanFilters(input)
   if (unsupported.length) throw new UnsupportedEridanFilterError(unsupported)
   const valid = validSearchParams(input)
   const sorting = auctionSort(input.get('sort'))
   const archive = ['sold', 'ended'].includes(input.get('archive') || '')
   const condition = valid.get('status'), seller = input.get('seller')?.trim().toLowerCase()
   if (seller && (seller.length < 2 || seller.length > 100)) throw new UnsupportedEridanFilterError(['seller'])
   const sellerType = valid.get('seller_type')
   const needsScan = Boolean(condition || seller || sellerType)
   const cutoff = new Date().toISOString()
   const scanDeadline = Date.now() + 20000
   const sites = [...new Set((input.get('site') || '1').split(','))]
   if (!sites.length || sites.some(site => !auctions[site])) throw new Error('Invalid auction')
   const page = Number(valid.get('page')), size = Number(valid.get('size')) * sites.length
   const params = new URLSearchParams({ page: String(page), page_size: String(size), ordering: sorting.ordering, ...(archive ? {sale_date__lte: new Date().toISOString()} : {status: 'active'}) })
   for (const [from, to] of [['year_from', 'year_from'], ['year_to', 'year_to']]) {
    const value = valid.get(from); if (value) params.set(to, value)
   }
   const selectedModel = valid.get('model'), selectedMake = valid.get('make')
   if (selectedMake) for (const [key, value] of Object.entries(eridanMakeParams(selectedMake))) params.set(key, value)
   if (selectedModel) {
    const groups = selectedMake ? await groupsFor(selectedMake) : undefined
    const ids = groups?.get(selectedModel.toUpperCase())
    if (ids?.length) {
     // A single documented OR query expands the family before provider pagination.
     // Never send model__name alongside model_ids: that would intersect away its variants.
     if (ids.length > 1000) throw new EridanSearchLimitError()
     params.set('model_ids', ids.join(','))
    } else params.set('model__name', selectedModel) // Preserve old specific-model URLs.
   }
   const selectedType = valid.get('vehicle_type')
   const types = eridanTypesForFilter(selectedType || undefined)
   if (!types.length) throw new UnsupportedEridanFilterError(['vehicle_type'])
   const codes = await categoryCodes()
   // Recently imported Eridan records can have only a thumbnail. Wait for real images
   // in catalogue results; direct/saved lot URLs still resolve while ingestion finishes.
   params.set('has_images', 'true')
   const fuelsBySite = new Map<string, (string | undefined)[]>(sites.map(site => [site, [undefined]]))
   if (valid.get('fuel')) {
    const wanted = fuelGroups[valid.get('fuel')!] || [valid.get('fuel')!.toLowerCase()]
    for (const site of sites) {
     const raw = await request('/fuel_types', new URLSearchParams({ auction: auctions[site] }))
     if (!Array.isArray(raw) || raw.some(value => typeof value !== 'string')) throw new Error('Invalid Eridan fuel types')
     // Directories contain case and trailing-space duplicates. Only query aliases
     // actually used by this auction, once each, using the trimmed API value.
     fuelsBySite.set(site, [...new Map(raw.filter(value => wanted.includes(value.trim().toLowerCase())).map(value => [value.trim().toLowerCase(), value.trim()])).values()])
    }
    if (![...fuelsBySite.values()].some(fuels => fuels.length)) throw new UnsupportedEridanFilterError(['fuel'])
   }
   const needed = page * size + 1
   if (needed > 10000) throw new EridanSearchLimitError()
   const merged = new Map<string, { car: AuctionCar; order: number; sortValue?: number }>()
   let calls = 0
   const make = valid.get('make')
   // Filter expired active rows upstream. Keep undated lots in a separate stream;
   // sale_date__gte alone would incorrectly hide them.
   const dateScopes = archive ? ['archive'] as const : ['upcoming', 'undated'] as const
   const streams = sites.flatMap(site => types.filter(type => !make || isEridanRoadMake(make, type)).flatMap(type => fuelsBySite.get(site)!.flatMap(fuel => dateScopes.map(dateScope => ({ site, type, fuel, dateScope })))))
   const maxCalls = Math.min(48, Math.max(16, streams.length * 4))
   const loadStream = async ({ site, type, fuel, dateScope }: { site: string; type: EridanRoadType; fuel: string | undefined; dateScope: 'archive' | 'upcoming' | 'undated' }) => {
     const stream = new Map<string, { car: AuctionCar; order: number; sortValue?: number }>()
     const seen = new Set<number>()
     let streamPage = 1
     while (stream.size < needed) {
      if (++calls > maxCalls || needsScan && Date.now() > scanDeadline) throw new EridanSearchLimitError()
      const query = new URLSearchParams(params)
      query.set('auction', auctions[site])
      query.set('item_type', codes[type])
      if (dateScope === 'upcoming') query.set('sale_date__gte', cutoff)
      if (dateScope === 'undated') query.set('sale_date__isnull', 'true')
      // Live Eridan accepts CSV here; repeated makes= entries silently use only the last value.
      if (!make) query.set('makes', eridanRoadBrands[type].join(','))
      if (fuel) query.set('fuel_type__name', fuel)
      query.set('page', String(streamPage))
      // Motorcycle feeds include misclassified marine/utility rows. Read a bounded
      // larger page to avoid spending multiple requests to fill a small UI page.
      // Seller fields can be absent across thousands of IAAI lots. Read the
      // documented 1000-row batch before applying our seller-presence convention.
      query.set('page_size', String(sellerType || seller ? Math.max(1000, needed) : needsScan || type === 'Motorcycle' && !make ? Math.max(100, needed) : needed))
      const response = record(await request('/lots', query))
      const data = lots(response, streamPage)
      const rawItems = response.items as unknown[]
      const before = seen.size
      for (let index = 0; index < data.items.length; index++) {
       const car = data.items[index], raw = record(rawItems[index]), order = number(raw.id)
       if (order === undefined) throw new Error('Invalid Eridan sort identity')
       const field = raw[sorting.field]
       const parsed = sorting.field === 'sale_date' || sorting.field === 'created_at'
        ? (typeof field === 'string' ? Date.parse(field) : NaN)
        : (field == null || field === '' ? NaN : Number(field))
       const sortValue = Number.isFinite(parsed) ? parsed : undefined
       seen.add(order)
       // Defend against misclassified upstream rows; fill the stream before slicing.
       if ((archive ? !isAuctionClosed(car) : car.auction_status !== 'active' || isAuctionClosed(car)) || String(car.site) !== site || raw.item_type !== codes[type] || !isEridanRoadMake(car.make, type) || !isEridanRoadModel(car.model, car.make) || !car.link_img_hd?.length) continue
       // Filter before filling/paginating the stream, not after slicing one API page.
       if (condition === 'Enhanced Vehicles' ? !car.enhanced : condition && car.status !== condition) continue
       if (seller && !car.seller?.toLowerCase().includes(seller)) continue
       if (sellerType && car.seller_type !== sellerType) continue
       if (!stream.has(car.id) || stream.get(car.id)!.order < order) stream.set(car.id, { car, order, sortValue })
      }
      if (!data.hasNext) break
      if (seen.size === before) throw new Error('Eridan pagination made no progress')
      streamPage++
     }
     for (const [id, item] of stream) if (!merged.has(id) || merged.get(id)!.order < item.order) merged.set(id, item)
   }
   // Cars/motorcycles and fuel aliases are independent. Bound concurrency to two,
   // preserve each stream's pagination order, and fail the whole search on an error.
   let nextStream = 0, failed = false
   const workers = await Promise.allSettled(Array.from({ length: Math.min(2, streams.length) }, async () => {
    while (!failed && nextStream < streams.length) {
     const stream = streams[nextStream++]
     try { await loadStream(stream) } catch (error) { failed = true; throw error }
    }
   }))
   for (const worker of workers) if (worker.status === 'rejected') throw worker.reason
   let all: AuctionCar[]
   if (sorting.value) {
    // Each upstream stream uses the same compound ordering before its pagination.
    // Merge its first N matches globally, then slice once across both auctions.
    all = [...merged.values()].sort((a,b) => {
     if (a.sortValue === undefined && b.sortValue !== undefined) return 1
     if (a.sortValue !== undefined && b.sortValue === undefined) return -1
     return sorting.direction * ((a.sortValue ?? 0) - (b.sortValue ?? 0) || a.order - b.order)
    }).map(item => item.car)
   } else {
    // Preserve the original mixed feed when no explicit sort is selected.
    const pools = sites.map(site => [...merged.values()].filter(item => String(item.car.site) === site).sort((a,b) => b.order-a.order).map(item => item.car))
    all = []
    for (let index=0; index<Math.max(0,...pools.map(pool=>pool.length)); index++) {
     for (const pool of pools) if (pool[index]) all.push(pool[index])
    }
   }
   return { success: true, items: all.slice((page - 1) * size, page * size), page, size, total: null, totalPages: null, hasNext: all.length > page * size }
  },
  async makes() {
   const makes = await directory('/makes')
   // Models are loaded only for the selected make. Eridan has >50k model rows.
   return Object.fromEntries(makes.filter(make => Boolean(name(make)) && isEridanRoadMake(String(make.name))).map(make => [canonicalEridanMake(String(make.name)), []]))
  },
  async models(make: string, vehicleType?: string) {
   if (!make.trim() || make.length > 100) throw new Error('Invalid make')
   if (!isEridanRoadMake(make)) return []
   if (!vehicleType) return [...(await groupsFor(make)).keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
   const types = eridanTypesForFilter(vehicleType)
   if (!types.length) throw new Error('Invalid vehicle type')
   const makeTypes = types.filter(type => isEridanRoadMake(make, type))
   if (!makeTypes.length) return []
   // /models has no category filter. Discover complete model IDs from actual active
   // lots of this make/type instead of guessing from a shared brand's model names.
   const codes = await categoryCodes(), cutoff = new Date().toISOString(), deadline = Date.now() + 40000
   const found = new Map<number, {id:number;name:string}>()
   const collect = async (type:EridanRoadType, undated:boolean) => {
    const seen = new Set<number>()
    for (let page=1; page<=24; page++) {
     if (Date.now() > deadline) throw new Error('Category directory time limit')
     const params = new URLSearchParams({...eridanMakeParams(make),item_type:codes[type],status:'active',has_images:'true',ordering:'id',page:String(page),page_size:'1000',...(undated?{sale_date__isnull:'true'}:{sale_date__gte:cutoff})})
     const response = record(await request('/lots',params))
     const data = lots(response,page), rawItems = response.items as unknown[], before=seen.size
     for (let index=0;index<data.items.length;index++) {
      const car=data.items[index], raw=record(rawItems[index]), model=record(raw.model)
      if (!Number.isSafeInteger(raw.id)) throw new Error('Invalid category directory identity')
      seen.add(Number(raw.id))
      if (car.vehicle_type!==type || !sameEridanMake(car.make,make) || car.auction_status!=='active' || isAuctionClosed(car) || !car.link_img_hd?.length) continue
      if (Number.isSafeInteger(model.id) && typeof model.name==='string' && isEridanRoadModel(model.name,make)) found.set(Number(model.id),{id:Number(model.id),name:model.name})
     }
     if (!data.hasNext) return
     if (seen.size===before) throw new Error('Category directory pagination made no progress')
    }
    throw new Error('Category directory page limit')
   }
   await Promise.all(makeTypes.flatMap(type => [collect(type,false),collect(type,true)]))
   return [...groupModelDirectory(make,[...found.values()]).keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
  },
  async lookup(query, lifecycle = 'active') {
   const q = query.trim().toUpperCase()
   if (/^[A-HJ-NPR-Z0-9]{17}$/.test(q)) {
    const params = new URLSearchParams({ vin: q, ...(lifecycle === 'sold' ? {sale_date__lte: new Date().toISOString()} : {status: 'active'}), ordering: '-sale_date', page: '1', page_size: '10' })
    const data = lots(await request('/lots', params), 1)
    const car = data.items.find(item => item.vin?.toUpperCase() === q && (lifecycle === 'sold' ? isAuctionClosed(item) : item.auction_status === 'active' && !isAuctionClosed(item)))
    if (car) return { lot: String(car.lot_id), site: String(car.site) }
    throw new Error('VIN not found')
   }
   if (!/^\d{5,12}$/.test(q)) throw new Error('Invalid lot')
   for (const site of ['1', '2']) {
    const car = lifecycle === 'sold' ? await detail(q, site) : await findLot(q, site)
    if (car && (lifecycle === 'sold' ? !isAuctionClosed(car) : isAuctionClosed(car))) continue
    if (car) return { lot: String(car.lot_id), site }
   }
   throw new Error('Lot not found')
  },
 }
}
