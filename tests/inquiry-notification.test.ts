import assert from 'node:assert/strict'
import test from 'node:test'
import { notifyInquiry } from '../src/lib/inquiry-notification'

const inquiry = { id: 42, name: '<b>Customer</b>', email: 'customer@example.test', phone: '+359888000000', message: '<script>text only</script>', car: 'BMW', budget: '20000 EUR' }
test('saved inquiry notification goes to the business and preserves customer details as plain text', async () => {
 let sent: any
 assert.equal(await notifyInquiry(inquiry, {
  enabled: true, siteURL: 'https://koliotamerika.bg',
  getRecipient: async () => 'office@example.test', send: async mail => { sent = mail },
  warn: () => assert.fail('unexpected warning'),
 }), true)
 assert.equal(sent.to, 'office@example.test')
 assert.deepEqual(sent.replyTo, { address: inquiry.email, name: inquiry.name })
 assert.equal(sent.html, undefined)
 assert.ok(sent.text.includes(inquiry.message))
 assert.ok(sent.text.includes('https://koliotamerika.bg/admin/collections/inquiries/42'))
})
test('missing SMTP never sends; failed delivery does not reject or expose customer data', async () => {
 let calls = 0; const warnings: string[] = []
 const delivery = { enabled: false, siteURL: 'https://koliotamerika.bg', getRecipient: async () => 'office@example.test',
  send: async () => { calls++; throw new Error('SMTP credentials and customer data must not appear in logs') }, warn: (message: string) => warnings.push(message) }
 assert.equal(await notifyInquiry(inquiry, delivery), false)
 assert.equal(calls, 0)
 assert.equal(await notifyInquiry(inquiry, { ...delivery, enabled: true }), false)
 assert.equal(calls, 1)
 assert.equal(warnings.length, 2)
 assert.ok(!warnings[0].includes('credentials'))
 assert.ok(!warnings[0].includes(inquiry.email))
 assert.equal(await notifyInquiry(inquiry, { ...delivery, enabled: true, getRecipient: async () => '' }), false)
 assert.equal(calls, 1)
})

test('SMTP acceptance is logged without leaking envelope or SMTP response', async () => {
 const logs: string[] = []
 const delivery = { enabled: true, siteURL: 'https://koliotamerika.bg',
  getRecipient: async () => 'office@example.test',
  send: async () => ({ accepted: ['office@example.test'], response: '250 secret SMTP server detail' }),
  info: (line: string) => logs.push(line), warn: (line: string) => logs.push(line) }
 assert.equal(await notifyInquiry(inquiry, delivery), true)
 assert.ok(logs.some(line => line.includes('accepted by SMTP')))
 assert.ok(!logs.join(' ').includes('office@example.test'))
 assert.ok(!logs.join(' ').includes('secret'))
 assert.equal(await notifyInquiry(inquiry, { ...delivery, send: async () => ({ accepted: [], rejected: ['office@example.test'] }) }), false)
 assert.ok(logs.some(line => line.includes('recipient_rejected')))
})
test('SMTP failures report only a known category, never error text or customer data', async () => {
 for (const [code, reason] of [['EAUTH', 'authentication'], ['EDNS', 'dns'], ['ETIMEDOUT', 'timeout'], ['ECONNREFUSED', 'connection'], ['ETLS', 'tls'], ['secret-value', 'unknown']]) {
  const logs: string[] = []
  const error = Object.assign(new Error(inquiry.email + ' password=private'), { code, response: inquiry.message, command: 'AUTH private' })
  assert.equal(await notifyInquiry(inquiry, { enabled: true, siteURL: 'https://koliotamerika.bg',
   getRecipient: async () => 'office@example.test', send: async () => { throw error },
   warn: line => logs.push(line) }), false)
  assert.ok(logs[0].includes('failed: ' + reason + ';'))
  assert.ok(!logs[0].includes(inquiry.email))
  assert.ok(!logs[0].includes('private'))
  assert.ok(!logs[0].includes('secret-value'))
 }
})
