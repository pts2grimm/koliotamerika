import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAuctionDate, auctionSchedule } from '../src/lib/auction-schedule'
import { normalizeCar } from '../src/lib/auction-providers/normalize'

test('auction dates use Sofia winter/summer time and handle DST boundaries', () => {
 const show = (value: string) => auctionSchedule(parseAuctionDate(value), 0)
 assert.equal(show('2026-10-12T14:00:00.000Z').time, '17:00')
 assert.equal(show('2026-12-12T14:00:00Z').time, '16:00')
 assert.equal(show('2026-03-29T00:30:00Z').time, '02:30')
 assert.equal(show('2026-03-29T01:30:00Z').time, '04:30')
 assert.equal(show('2026-10-25T00:30:00Z').time, '03:30')
 assert.equal(show('2026-10-25T01:30:00Z').time, '03:30')
 assert.equal(show('2026-10-12T23:00:00Z').date, '13.10.2026 г.')
 assert.equal(parseAuctionDate('2026-10-12T17:00:00+03:00'), parseAuctionDate('2026-10-12T14:00:00Z'))
})
test('countdown shows complete remaining days, hours and minutes and handles the start boundary', () => {
 const now = Date.parse('2026-10-10T12:00:00Z')
 assert.equal(auctionSchedule(now + ((2 * 24 + 3) * 60 + 15) * 60000, now).countdown, '2 дни · 3 ч · 15 мин')
 assert.equal(auctionSchedule(now + 86400000, now).countdown, '1 ден')
 assert.equal(auctionSchedule(now + 23 * 3600000, now).countdown, '23 ч')
 assert.equal(auctionSchedule(now + 30000, now).countdown, 'Под 1 минута')
 assert.equal(auctionSchedule(now, now).state, 'past')
 assert.equal(auctionSchedule(now - 60000, now).countdown, 'Посоченият час е минал')
})
test('missing, impossible and unzoned dates never become an invented local auction time', () => {
 for (const input of [undefined, '', 'invalid', '2026-02-30T12:00:00Z', '2026-13-01T12:00:00Z', '2026-10-12', '2026-10-12T14:00:00']) {
  assert.equal(parseAuctionDate(input), null)
  assert.equal(auctionSchedule(parseAuctionDate(input), 0).countdown, 'Очаква се дата')
 }
})
test('provider date aliases survive normalization when its primary field is empty', () => {
 assert.equal(normalizeCar({ lot_id: 70000000, site: 1, auction_date: '', saleDate: '2026-10-12T14:00:00Z' })?.auction_date, '2026-10-12T14:00:00Z')
})
