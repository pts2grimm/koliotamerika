import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { validateConsentSubmission, consentPolicyVersion } from '../src/lib/consent-audit'
import { adminPeriod, dayStart } from '../src/lib/admin-period'
import { csvCell } from '../src/lib/consent-csv'

test('consent accepts only explicit boolean categories and consistent actions', () => {
  const input = { receipt: randomUUID(), event: randomUUID(), analytics: true, marketing: false, action: 'save_preferences', policyVersion: consentPolicyVersion }
  assert.deepEqual(validateConsentSubmission(input), input)
  for (const change of [{ analytics: 'false' }, { action: 'accept_all' }, { action: 'necessary_only' }, { policyVersion: 'old' }, { receipt: 'bad' }, { event: '' }]) {
    assert.equal(validateConsentSubmission({ ...input, ...change }), null)
  }
  assert.equal(validateConsentSubmission(null), null)
  assert.equal(validateConsentSubmission([]), null)
  assert.deepEqual(validateConsentSubmission({ ...input, email: 'ignored@example.test', ip: '1.2.3.4' }), input)
})
test('Sofia calendar periods handle DST and invalid dates without throwing', () => {
  assert.equal(dayStart('2026-10-25'), '2026-10-24T21:00:00.000Z')
  assert.equal(dayStart('2026-10-26'), '2026-10-25T22:00:00.000Z')
  assert.equal(dayStart('2026-03-29'), '2026-03-28T22:00:00.000Z')
  assert.equal(dayStart('2026-03-30'), '2026-03-29T21:00:00.000Z')
  const now = new Date('2026-10-17T22:30:00Z')
  const defaultPeriod = adminPeriod({}, now)
  assert.equal(defaultPeriod.to, '2026-10-18')
  assert.equal(defaultPeriod.days, 30)
  const custom = adminPeriod({ period: 'custom', from: '2026-10-25', to: '2026-10-26' }, new Date('2026-11-01'))
  assert.equal(Date.parse(custom.end) - Date.parse(custom.start), 49 * 3600000)
  assert.equal(adminPeriod({ period: 'custom', from: '2026-02-30' }, now).days, 30)
  assert.equal(adminPeriod({ period: 'custom', from: '2000-01-01', to: '2099-12-31' }, now).days, 90)
})
test('CSV escapes multiline content and spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"')
  assert.equal(csvCell('  +SUM(1)'), '"\'  +SUM(1)"')
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"')
})
