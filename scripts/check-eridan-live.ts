import assert from 'node:assert/strict'
import { createEridanProvider } from '../src/lib/auction-providers/eridan'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'

if (!process.env.ERIDAN_API_KEY) {
 console.log('LIVE_CHECK_SKIPPED: ERIDAN_API_KEY is missing.')
 process.exit(0)
}
try {
 let requests = 0
 const request = createEridanTransport({ apiKey: process.env.ERIDAN_API_KEY, fetch: async (url, init) => {
  requests++
  return fetch(url, init)
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
  const data = await provider.search(new URLSearchParams({ site, size: '6', vehicle_type: 'Automobile' }))
  assert.ok(data.items.length > 0)
  assert.ok(data.items.every(car => String(car.site) === site))
  const first = data.items[0]
  const car = await provider.detail(String(first.lot_id), site)
  assert.equal(car?.id, first.id)
  console.log('LIVE_CATALOGUE_AND_DETAIL_OK', { site, items: data.items.length, hasNext: data.hasNext, totalKnown: data.total !== null })
 }
 console.log('LIVE_ADAPTER_OK', { requests })
} catch {
 // Never print the error object, request headers, body, lot numbers, VINs or credentials.
 console.error('LIVE_ADAPTER_FAILED: validate provider availability, schema and quota using the protected contract check.')
 process.exitCode = 1
}
