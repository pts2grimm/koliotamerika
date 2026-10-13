import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'

if (!process.env.ERIDAN_API_KEY) {
 console.log('LIVE_CHECK_SKIPPED: ERIDAN_API_KEY is missing.')
 process.exit(1)
}
let stage = 'openapi'
try {
 const schemaResponse = await fetch('https://catalog.eridan.software/api/openapi.json', { redirect: 'error', signal: AbortSignal.timeout(15000) })
 assert.equal(schemaResponse.status, 200)
 const schema = await schemaResponse.json()
 type Parameter = { name?: string; in?: string; $ref?: string }
 type Operation = { parameters?: Parameter[]; get?: { parameters?: Parameter[] } }
 const lotPath = Object.keys(schema.paths || {}).find(path => path.endsWith('/lots') || path.endsWith('/lots/'))
 assert.ok(lotPath, 'Missing lots operation in OpenAPI')
 const operation = schema.paths[lotPath] as Operation
 const parameters = [...(operation.parameters || []), ...(operation.get?.parameters || [])].map(parameter => {
  if (!parameter.$ref?.startsWith('#/')) return parameter
  return parameter.$ref.slice(2).split('/').reduce((value, key) => value?.[key], schema) as Parameter
 })
 const lotParameters = new Set(parameters.filter(p => p?.in === 'query' && p.name).map(p => p.name!))
 assert.ok(lotParameters.size > 0, 'Missing documented catalogue query parameters')
 console.log('LIVE_OPENAPI', { version: schema.info?.version, lotParameters: [...lotParameters] })
 stage = 'directories'
 let requests = 0, activeLots = 0, peakLots = 0, lotRequestMs = 0
 const request = createEridanTransport({ apiKey: process.env.ERIDAN_API_KEY, fetch: async (url, init) => {
  if (url.pathname.endsWith('/lots')) for (const key of url.searchParams.keys()) assert.ok(lotParameters.has(key), 'Undocumented catalogue query parameter')
  requests++
  const isLotSearch = url.pathname.endsWith('/lots'), started = performance.now()
  if (isLotSearch) { activeLots++; peakLots = Math.max(peakLots, activeLots) }
  try {
   const response = await fetch(url, init)
   console.log('LIVE_REQUEST', { path: url.pathname, status: response.status, elapsedMs: Math.round(performance.now() - started), parameterNames: [...url.searchParams.keys()] })
   return response
  } finally { if (isLotSearch) { activeLots--; lotRequestMs += performance.now() - started } }
 } })
 const provider = createEridanProvider(request)
 const makes = await provider.makes()
 assert.ok(Object.keys(makes).length > 0)
 const bmw = Object.keys(makes).find(make => make.trim().toLowerCase() === 'bmw')
 assert.ok(bmw)
 const models = await provider.models!(bmw)
 assert.ok(models.length > 0)
 console.log('LIVE_DIRECTORIES_OK', { makes: Object.keys(makes).length, selectedMakeModels: models.length })
 for (const site of ['1', '2']) {
  stage = 'catalogue-detail-' + site
  const data = await provider.search(new URLSearchParams({ site, size: '6', vehicle_type: 'Automobile' }))
  assert.ok(data.items.length > 0)
  assert.ok(data.items.every(car => String(car.site) === site))
  const first = data.items[0]
  const car = await provider.detail(String(first.lot_id), site)
  assert.equal(car?.id, first.id)
  assert.ok((car?.link_img_hd?.length || 0) > 1)
  console.log('LIVE_CATALOGUE_AND_DETAIL_OK', { site, items: data.items.length, hasNext: data.hasNext, totalKnown: data.total !== null, galleryImages: car?.link_img_hd?.length })
 }
 stage = 'motorcycles'
 const bikes = await provider.search(new URLSearchParams({ site: '1,2', size: '6', vehicle_type: 'Motorcycle' }))
 assert.ok(bikes.items.length > 0)
 assert.ok(bikes.items.every(car => car.vehicle_type === 'Motorcycle' && (car.link_img_hd?.length || 0) > 0))
 console.log('LIVE_MOTORCYCLES_OK', { items: bikes.items.length, makes: [...new Set(bikes.items.map(car => car.make))] })
 stage = 'reported-lot'
 const reported = await provider.detail('66579406', '1')
 console.log('REPORTED_LOT_BID', { found: Boolean(reported), currentBid: reported?.current_bid ?? null, currency: reported?.currency })
 peakLots = 0; lotRequestMs = 0
 const started = performance.now()
 stage = 'mixed-bmw'
 const mixed = await provider.search(new URLSearchParams({site:'1,2',size:'6',make:'BMW'}))
 assert.ok(mixed.items.length > 0)
 assert.equal(peakLots, 2)
 console.log('LIVE_PARALLEL_SEARCH_OK', {elapsedMs:Math.round(performance.now()-started),sumOfUpstreamMs:Math.round(lotRequestMs),peakConcurrentRequests:peakLots,items:mixed.items.length})
 stage = 'reported-filter-query'
 const filtered = await provider.search(new URLSearchParams({ site: '1', size: '6', make: 'BMW', model: '3 SERIES', year_from: '2013', fuel: 'Gasoline' }))
 console.log('LIVE_FILTER_QUERY_OK', { items: filtered.items.length, hasNext: filtered.hasNext })
 console.log('LIVE_ADAPTER_OK', { requests })
} catch (error) {
 // Never print the error object, request headers, body, lot numbers, VINs or credentials.
 const message = error instanceof Error ? error.message : ''
 const reason = /Auction provider HTTP [0-9]{3}/.exec(message)?.[0]
  || (message.includes('timed out') ? 'timeout' : message.includes('temporarily paused') ? 'paused' : 'contract-or-connection')
 console.error('LIVE_ADAPTER_FAILED', { stage, reason })
 process.exitCode = 1
}
