import assert from 'node:assert/strict'
import test from 'node:test'
import { notifyInquiryBeforeResponse } from '../src/lib/inquiry-notification'
const inquiry = { id: 1, name: 'Test', email: 'visitor@example.test', phone: '+359888000000', message: 'Local test inquiry' }
const base = { enabled: true, siteURL: 'https://koliotamerika.bg', getRecipient: async () => 'office@example.test', warn: (_line: string) => {} }
test('awaited notification waits for SMTP completion and never retries', async () => {
 let finish!: (value: unknown) => void, calls = 0, returned = false
 const work = notifyInquiryBeforeResponse(inquiry, { ...base, send: () => { calls++; return new Promise(resolve => { finish = resolve }) } }, 1000).then(result => { returned = true; return result })
 await new Promise(resolve => setTimeout(resolve, 10))
 assert.equal(returned, false)
 finish({ accepted: ['office@example.test'] })
 assert.equal(await work, true)
 assert.equal(calls, 1)
})
test('a stalled send bounds the wait without claiming failure or retrying', async () => {
 const warnings: string[] = []; let calls = 0
 const result = await notifyInquiryBeforeResponse(inquiry, { ...base, warn: line => warnings.push(line), send: () => { calls++; return new Promise(() => {}) } }, 10)
 assert.equal(result, false)
 assert.equal(calls, 1)
 assert.ok(warnings[0].includes('wait_timeout'))
 assert.ok(warnings[0].includes('unknown'))
 assert.ok(!warnings[0].includes(inquiry.email))
})
test('a recipient lookup finishing after the deadline cannot start mail', async () => {
 let resolveRecipient!: (value: string) => void, calls = 0
 const work = notifyInquiryBeforeResponse(inquiry, { ...base, getRecipient: () => new Promise(resolve => { resolveRecipient = resolve }),
  send: async () => { calls++; return {} } }, 10)
 assert.equal(await work, false)
 resolveRecipient('office@example.test')
 await new Promise(resolve => setTimeout(resolve, 10))
 assert.equal(calls, 0)
})
