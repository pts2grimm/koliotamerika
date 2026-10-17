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
