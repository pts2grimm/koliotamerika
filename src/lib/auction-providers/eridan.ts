import type { AuctionCar, AuctionProvider, AuctionTransport } from './types'
import { record, validSearchParams } from './normalize'
import { eridanRoadBrands, eridanRoadTypes, isEridanRoadMake, isEridanRoadModel, type EridanRoadType } from './eridan-scope'

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
 const knownCurrency = currency && ['USD', 'CAD', 'EUR', 'BGN'].includes(currency)
 // The current documented response does not specify odometer units. Do not assume US == miles.
 const unit = raw.odometer_unit === 'mi' || raw.odometer_unit === 'km' ? raw.odometer_unit : 'unknown'
 return {
  id: site + ':' + lot, lot_id: lot, site, title: text(raw.name) || [year || '', make, model].filter(Boolean).join(' '),
  make, model, year, vehicle_type: raw.item_type === 'VEHTYPE_V' ? 'Automobile' : raw.item_type === 'VEHTYPE_M' ? 'Motorcycle' : undefined, vin: text(raw.vin), odometer: number(raw.odometer), odometer_unit: unit,
  currency, current_bid: knownCurrency ? number(raw.current_bid) : undefined,
  buy_now: knownCurrency ? number(raw.buy_now_price) : undefined, price_new: knownCurrency ? number(raw.retail_value) : undefined,
  location: [text(raw.city), text(raw.state)].filter(Boolean).join(', ') || text(raw.yard),
  state: text(raw.state), auction_date: text(raw.sale_date), status: mechanicalStatus(raw),
  damage_pr: name(raw.primary_damage), damage_sec: name(raw.secondary_damage),
  document_old: [text(raw.title_type), text(raw.title_state)].filter(Boolean).join(' ') || undefined,
  fuel: Object.entries(fuelGroups).find(([, names]) => names.includes(text(raw.fuel)?.toLowerCase() || ''))?.[0] || text(raw.fuel), transmission: text(raw.transmission), engine: text(raw.engine), drive: text(raw.drive),
  seller: text(raw.seller), link_img_hd: imageURLs(raw.images), link_img_small: imageURLs([raw.thumb_url]),
 }
}

export class UnsupportedEridanFilterError extends Error {
 constructor(readonly filters: string[]) { super('Eridan does not document these filters: ' + filters.join(', ')) }
}
export function unsupportedEridanFilters(input: URLSearchParams) {
 // These cannot be reproduced by filtering just one result page: that loses matching cars and breaks pagination.
 return ['status', 'seller_type', 'cylinders'].filter(key => Boolean(input.get(key)?.trim()))
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
 let categories: Promise<Record<EridanRoadType, string>> | undefined
 const categoryCodes = () => categories ||= (async () => {
  const raw = await request('/item_types', new URLSearchParams())
  if (!Array.isArray(raw)) throw new Error('Invalid Eridan vehicle types')
  const patterns = { Automobile: /^(?:vehicle|automobiles?|passenger vehicles?)$/i, Motorcycle: /^motorcycles?$/i }
  return Object.fromEntries(eridanRoadTypes.map(type => {
   const match = raw.map(record).find(row => patterns[type].test(text(row.label) || ''))
   if (!match || match.value !== (type === 'Automobile' ? 'VEHTYPE_V' : 'VEHTYPE_M')) throw new Error('Eridan road category is not confirmed')
   return [type, String(match.value)]
  })) as Record<EridanRoadType, string>
 })().catch(error => { categories = undefined; throw error })
 const detail = async (lot: string, site: string) => {
  if (!/^\d{5,12}$/.test(lot) || !auctions[site]) throw new Error('Invalid lot')
  const params = new URLSearchParams({ lot_number: lot, auction: auctions[site], ordering: '-updated_at', page: '1', page_size: '10' })
  const data = lots(await request('/lots', params), 1)
  return data.items.find(car => car.lot_id === Number(lot) && String(car.site) === site)
 }
 return {
  name: 'eridan', detail,
  async search(input) {
   const unsupported = unsupportedEridanFilters(input)
   if (unsupported.length) throw new UnsupportedEridanFilterError(unsupported)
   const valid = validSearchParams(input)
   const sites = [...new Set((input.get('site') || '1').split(','))]
   if (!sites.length || sites.some(site => !auctions[site])) throw new Error('Invalid auction')
   const page = Number(valid.get('page')), size = Number(valid.get('size')) * sites.length
   const params = new URLSearchParams({ page: String(page), page_size: String(size), ordering: '-id' })
   if (sites.length === 1) params.set('auction', auctions[sites[0]])
   for (const [from, to] of [['make', 'make__name'], ['model', 'model__name'], ['year_from', 'year_from'], ['year_to', 'year_to']]) {
    const value = valid.get(from); if (value) params.set(to, value)
   }
   const selectedType = valid.get('vehicle_type')
   if (selectedType && !eridanRoadTypes.includes(selectedType as EridanRoadType)) throw new UnsupportedEridanFilterError(['vehicle_type'])
   const types = selectedType ? [selectedType as EridanRoadType] : eridanRoadTypes
   const codes = await categoryCodes()
   // Recently imported Eridan records can have only a thumbnail. Wait for real images
   // in catalogue results; direct/saved lot URLs still resolve while ingestion finishes.
   params.set('has_images', 'true')
   let fuels: (string | undefined)[] = [undefined]
   if (valid.get('fuel')) {
    const raw = await request('/fuel_types', new URLSearchParams())
    if (!Array.isArray(raw) || raw.some(value => typeof value !== 'string')) throw new Error('Invalid Eridan fuel types')
    const wanted = fuelGroups[valid.get('fuel')!] || [valid.get('fuel')!.toLowerCase()]
    fuels = [...new Map(raw.filter(value => wanted.includes(value.trim().toLowerCase())).map(value => [value.toLowerCase(), value])).values()]
    if (!fuels.length) throw new UnsupportedEridanFilterError(['fuel'])
   }
   const needed = page * size + 1
   if (needed > 10000) throw new Error('Eridan search window exceeded; narrow the filters')
   const merged = new Map<string, { car: AuctionCar; order: number }>()
   let calls = 0
   for (const type of types) {
    const make = valid.get('make')
    if (make && !isEridanRoadMake(make, type)) continue
    for (const fuel of fuels) {
     const stream = new Map<string, { car: AuctionCar; order: number }>()
     const seen = new Set<number>()
     let streamPage = 1
     while (stream.size < needed) {
      if (++calls > 16) throw new Error('Eridan search request budget reached; narrow the filters')
      const query = new URLSearchParams(params)
      query.set('item_type', codes[type])
      // Live Eridan accepts CSV here; repeated makes= entries silently use only the last value.
      if (!make) query.set('makes', eridanRoadBrands[type].join(','))
      if (fuel) query.set('fuel_type__name', fuel)
      query.set('page', String(streamPage))
      query.set('page_size', String(needed))
      const response = record(await request('/lots', query))
      const data = lots(response, streamPage)
      const rawItems = response.items as unknown[]
      const before = seen.size
      for (let index = 0; index < data.items.length; index++) {
       const car = data.items[index], raw = record(rawItems[index]), order = number(raw.id)
       if (order === undefined) throw new Error('Invalid Eridan sort identity')
       seen.add(order)
       // Defend against misclassified upstream rows; fill the stream before slicing.
       if (raw.item_type !== codes[type] || !isEridanRoadMake(car.make, type) || !isEridanRoadModel(car.model) || !car.link_img_hd?.length) continue
       if (!stream.has(car.id) || stream.get(car.id)!.order < order) stream.set(car.id, { car, order })
      }
      if (!data.hasNext) break
      if (seen.size === before) throw new Error('Eridan pagination made no progress')
      streamPage++
     }
     for (const [id, item] of stream) if (!merged.has(id) || merged.get(id)!.order < item.order) merged.set(id, item)
    }
   }
   // Merge category/fuel streams before slicing; never post-filter a visible page.
   const all = [...merged.values()].sort((a, b) => b.order - a.order).map(item => item.car)
   return { success: true, items: all.slice((page - 1) * size, page * size), page, size, total: null, totalPages: null, hasNext: all.length > page * size }
  },
  async makes() {
   const makes = await directory('/makes')
   // Models are loaded only for the selected make. Eridan has >50k model rows.
   return Object.fromEntries(makes.filter(make => Boolean(name(make)) && isEridanRoadMake(String(make.name))).map(make => [String(make.name), []]))
  },
  async models(make: string) {
   if (!make.trim() || make.length > 100) throw new Error('Invalid make')
   if (!isEridanRoadMake(make)) return []
   const models = await directory('/models', { make__name: make })
   return [...new Set(models.filter(model => Boolean(name(model)) && isEridanRoadModel(String(model.name))).map(model => String(model.name)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  },
  async lookup(query) {
   const q = query.trim().toUpperCase()
   if (/^[A-HJ-NPR-Z0-9]{17}$/.test(q)) {
    const data = lots(await request('/lots', new URLSearchParams({ vin: q, ordering: '-updated_at', page: '1', page_size: '10' })), 1)
    const car = data.items.find(item => item.vin?.toUpperCase() === q)
    if (car) return { lot: String(car.lot_id), site: String(car.site) }
    throw new Error('VIN not found')
   }
   if (!/^\d{5,12}$/.test(q)) throw new Error('Invalid lot')
   for (const site of ['1', '2']) {
    const car = await detail(q, site)
    if (car) return { lot: String(car.lot_id), site }
   }
   throw new Error('Lot not found')
  },
 }
}
