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
 assert.equal(warnings.length, 1)
 assert.ok(!warnings[0].includes('credentials'))
 assert.ok(!warnings[0].includes(inquiry.email))
 assert.equal(await notifyInquiry(inquiry, { ...delivery, enabled: true, getRecipient: async () => '' }), false)
 assert.equal(calls, 1)
})
