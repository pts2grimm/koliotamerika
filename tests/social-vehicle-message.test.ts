import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vehiclePostMessage } from '../src/lib/social/vehicle-message'
import type { AuctionCar } from '../src/lib/auction-providers/types'

const car: AuctionCar = {
 id: '1', lot_id: 70935236, site: 1, title: '2016 BMW M3',
 make: 'BMW', model: 'M3', year: 2016, auction_status: 'active',
 auction_date: '2026-10-30T16:00:00Z',
}
const now = Date.parse('2026-10-28T12:00:00Z')

test('vehicle copy groups supplied facts, Bulgarian damage labels, auction and configured phone', () => {
 const body = vehiclePostMessage({
  ...car, engine: '3.0L', fuel: 'GAS', transmission: 'AUTOMATIC',
  odometer: 10000, odometer_unit: 'mi', damage_pr: 'FRONT END',
  damage_sec: 'FRONT END',
 }, '+359 88 829 2280', now)
 assert.ok(body.startsWith('🚘 2016 BMW M3\n\n'))
 assert.ok(body.includes('⚙️ 3.0L · Бензин · Автоматична скоростна кутия'))
 assert.ok(body.includes('мили)'))
 assert.ok(body.includes('🔧 Посочени щети: Предна част\n'))
 assert.ok(body.includes('30.10.2026'))
 assert.ok(body.includes('18:00 ч. (българско време)'))
 assert.ok(body.includes('Copart · Лот 70935236'))
 assert.ok(body.includes('📞 +359 88 829 2280'))
 assert.ok(body.includes('👇 Виж снимките'))
 assert.ok(body.length <= 2000)
})

test('minimal vehicle has no fabricated specifications, phone, price or condition', () => {
 const body = vehiclePostMessage({ ...car, current_bid: 1200, buy_now: 8000, price_new: 60000 }, null, now)
 for (const absent of ['⚙️', '🛣️', '🔧', '📞', '1200', '8000', '60000', '€', '$', 'Run & Drive']) {
  assert.ok(!body.includes(absent), absent)
 }
 assert.ok(body.includes('💬 Пиши ни'))
 assert.ok(body.includes('оферта за внос'))
})

test('odometer units are not guessed and zero remains a reported reading', () => {
 const unknown = vehiclePostMessage({ ...car, odometer: 12345 }, null, now)
 assert.ok(unknown.includes('мерната единица не е посочена'))
 const zero = vehiclePostMessage({ ...car, odometer: 0, odometer_unit: 'km' }, null, now)
 assert.ok(zero.includes('Показание на километража: 0 км'))
 for (const odometer of [-1, NaN, Infinity]) {
  assert.ok(!vehiclePostMessage({ ...car, odometer }, null, now).includes('🛣️'))
 }
})

test('auction wall time respects DST and invalid/past/unzoned dates are not advertised as upcoming', () => {
 const summer = vehiclePostMessage({ ...car, auction_date: '2026-10-24T15:30:00Z' }, null, Date.parse('2026-10-23T00:00:00Z'))
 assert.ok(summer.includes('18:30 ч.'))
 for (const auction_date of [undefined, 'invalid', '2026-10-30T16:00:00', '2026-10-27T16:00:00Z']) {
  const body = vehiclePostMessage({ ...car, auction_date }, null, now)
  assert.ok(body.includes('📅 Датата на търга се уточнява'))
  assert.ok(!body.includes('българско време'))
 }
})

test('unknown damage is preserved, placeholders omitted, and text cannot add extra lines', () => {
 const body = vehiclePostMessage({
  ...car, site: 2, title: '2016 BMW\nM3', fuel: 'UNKNOWN',
  damage_pr: 'UNDERCARRIAGE', damage_sec: 'N/A',
 }, 'bad\ncontact@example.test', now)
 assert.ok(body.startsWith('🚘 2016 BMW M3\n'))
 assert.ok(body.includes('🔧 Посочени щети: UNDERCARRIAGE\n'))
 assert.ok(body.includes('IAAI · Лот'))
 assert.ok(!body.includes('UNKNOWN'))
 assert.ok(!body.includes('N/A'))
 assert.ok(!body.includes('📞'))
})
