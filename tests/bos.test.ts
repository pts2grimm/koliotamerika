import assert from 'node:assert/strict'
import test from 'node:test'
import { bosAmounts, bosToday, validBosDate, validBosMoney } from '../src/lib/bos'
test('BOS money uses cents and never infers payment', () => {
  assert.deepEqual(bosAmounts(6000, 300, 0), { total: 6300, balance: 6300 })
  assert.deepEqual(bosAmounts(.1, .2, .1), { total: .3, balance: .2 })
  assert.deepEqual(bosAmounts(6000, 300, 6300), { total: 6300, balance: 0 })
  for (const value of [-1, NaN, Infinity, .001, 100000000, '6000', null]) assert.equal(validBosMoney(value), false)
  assert.throws(() => bosAmounts(6000, 300, 6300.01))
})
test('sale dates are real calendar dates; default follows Bulgaria midnight', () => {
  assert.equal(validBosDate('2026-02-30'), false)
  assert.equal(validBosDate('2028-02-29'), true)
  assert.equal(validBosDate('2026-2-3'), false)
  assert.equal(bosToday(new Date('2026-10-17T21:30:00Z')), '2026-10-18')
})

import { automaticPostalCode, buyerValues, distinctBuyers, isBulgaria, searchPlaces } from '../src/lib/bos-buyer'
import postalPlaces from '../src/data/bg-postal-codes.json'
test('buyer reuse copies buyer fields only and clears absent optional details', () => {
  const source = { id: 1, buyerName: 'Same Name', buyerCity: 'Sofia', buyerPostalCode: '1111', vin: 'NEVER COPY', vehiclePrice: 9000, paidAmount: 1000 }
  const copied = buyerValues(source)
  assert.equal(copied.buyerPostalCode, '1111')
  assert.equal(copied.buyerLicense, '')
  assert.equal('vin' in copied, false)
  assert.equal('paidAmount' in copied, false)
  assert.equal(distinctBuyers([source, {...source, id: 2}, {...source, id: 3, buyerPostalCode: '1000'}]).length, 2)
})
test('Bulgarian directory supports both scripts, homonyms and address-specific code confirmation', () => {
  assert.equal(isBulgaria(' България '), true)
  assert.equal(isBulgaria('BG'), true)
  assert.equal(isBulgaria('Romania'), false)
  assert.equal(searchPlaces(postalPlaces, 'Sofia')[0].name.split(' / ')[0], 'София')
  const sofia = searchPlaces(postalPlaces, 'София')[0]
  assert.equal(automaticPostalCode(sofia), null)
  const bansko = searchPlaces(postalPlaces, 'Bansko').find(p => p.name.startsWith('Банско / '))!
  assert.equal(automaticPostalCode(bansko), '2770')
  const ambiguous = postalPlaces.find(p => p.codes.length > 1)!
  assert.equal(automaticPostalCode(ambiguous), null)
  assert.ok(searchPlaces(postalPlaces, 'Бяла').length > 1)
  assert.ok(postalPlaces.every(p => p.codes.every(code => /^\d{4}$/.test(code))))
})
