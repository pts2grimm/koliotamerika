import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { encryptIntegrationToken, decryptIntegrationToken } from '../src/lib/integration-secrets'
import { trackingAllowed, publicIntegrations, safeTrackingURL } from '../src/lib/integration-config'
import { consentFromCookies, parseConsent } from '../src/lib/tracking-consent'
import { buildMetaLead, sendMetaLead } from '../src/lib/meta-capi'

const now = Date.now()
const consent = (marketing = true) => 'koa-consent=' + encodeURIComponent(JSON.stringify({ version: 1, analytics: true, marketing, updatedAt: now }))
const request = (cookie = consent()) => new Request('https://koliotamerika.bg/api/inquiry', { headers: { origin: 'https://koliotamerika.bg', cookie, 'user-agent': 'Test browser' } })
const lead = { id: 'dc227843-a7cf-4ca2-98c1-902bef201707', email: ' TEST@EXAMPLE.COM ', phone: '0888 292 280', path: '/kontakti?email=private@example.com#private', marketing: true, time: now }
const config = { enabled: true, hostname: 'koliotamerika.bg', pixelId: '12345678901', capiEnabled: true, metaAccessToken: 'ciphertext' }
test('CAPI credentials are encrypted, authenticated and fail closed with a different key', () => {
  const encrypted = encryptIntegrationToken('fake-secret-token', 'test-key')
  assert.notEqual(encrypted, encryptIntegrationToken('fake-secret-token', 'test-key'))
  assert.ok(!encrypted.includes('fake-secret-token'))
  assert.equal(decryptIntegrationToken(encrypted, 'test-key'), 'fake-secret-token')
  assert.throws(() => decryptIntegrationToken(encrypted, 'wrong-key'), /could not be decrypted/)
  assert.throws(() => decryptIntegrationToken('plaintext', 'test-key'), /could not be decrypted/)
})
test('domain and preview guards reject mismatches and public config cannot leak CAPI secrets', () => {
  for (const [url, preview] of [['https://evil-koliotamerika.bg', false], ['https://koliotamerika.bg.evil.test', false], ['https://papayawhip-ram-220810.hostingersite.com', false], ['https://koliotamerika.bg', true]] as const) assert.equal(trackingAllowed(config, url, preview), false)
  assert.equal(trackingAllowed(config, 'https://www.koliotamerika.bg', false), true)
  const publicConfig = publicIntegrations({ ...config, metaTestCode: 'private-test-code', gaEnabled: true, gaId: 'G-TEST12345', installation: 'gtm', gtmId: 'GTM-TEST123', pixelEnabled: true }, 'https://koliotamerika.bg', false)
  assert.equal(publicConfig.gaId, '')
  assert.equal(publicConfig.pixelId, '')
  assert.equal(publicConfig.gtmId, 'GTM-TEST123')
  assert.ok(!JSON.stringify(publicConfig).includes('ciphertext'))
  assert.ok(!JSON.stringify(publicConfig).includes('private-test-code'))
})
test('expired, malformed and string-valued consent is denied', () => {
  for (const value of ['', '%', 'null', JSON.stringify({ version: 1, analytics: true, marketing: 'true', updatedAt: now }), JSON.stringify({ version: 1, analytics: true, marketing: true, updatedAt: 1 })]) assert.equal(parseConsent(value), null)
  assert.equal(consentFromCookies(consent())?.marketing, true)
})
test('Meta payload hashes normalized contact data and omits query, message, name and raw contact values', () => {
  const event = buildMetaLead(lead, request(), 'https://koliotamerika.bg')!
  assert.equal(event.event_id, lead.id)
  assert.equal(event.event_name, 'Lead')
  assert.equal(event.event_source_url, 'https://koliotamerika.bg/kontakti')
  assert.deepEqual(event.user_data.em, [createHash('sha256').update('test@example.com').digest('hex')])
  assert.deepEqual(event.user_data.ph, [createHash('sha256').update('359888292280').digest('hex')])
  assert.doesNotMatch(JSON.stringify(event), /TEST@|0888|private@example/)
  assert.equal(safeTrackingURL('https://evil.test/a', 'https://koliotamerika.bg'), 'https://koliotamerika.bg/kontakti')
  assert.equal(safeTrackingURL('/nova-parola?token=secret', 'https://koliotamerika.bg'), 'https://koliotamerika.bg/kontakti')
})
test('CAPI needs cookie consent AND submission consent and never bypasses domain restrictions', async () => {
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; return Response.json({ events_received: 1 }) }
  for (const options of [
    { request: request('') }, { request: request(consent(false)) }, { lead: { ...lead, marketing: false } },
    { preview: true }, { config: { ...config, enabled: false } }, { origin: 'https://preview.example' },
  ]) assert.equal(await sendMetaLead({ config, lead, request: request(), origin: 'https://koliotamerika.bg', preview: false, decrypt: () => 'fake-token', fetcher, ...options }), 'skipped')
  assert.equal(calls, 0)
})
test('CAPI uses a credential header, retries 5xx once with the same event ID and honors test mode', async () => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetcher: typeof fetch = async (url, init) => { calls.push({ url: String(url), init: init! }); return calls.length === 1 ? new Response('', { status: 503 }) : Response.json({ events_received: 1 }) }
  const result = await sendMetaLead({ config: { ...config, metaTestCode: 'TEST123' }, lead, request: request(), origin: 'https://koliotamerika.bg', preview: false, decrypt: () => 'fake-token', fetcher })
  assert.equal(result, 'sent'); assert.equal(calls.length, 2)
  assert.equal(calls[0].init.body, calls[1].init.body)
  assert.ok(!calls[0].url.includes('fake-token'))
  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer fake-token')
  assert.equal(JSON.parse(String(calls[0].init.body)).test_event_code, 'TEST123')
  assert.equal(JSON.parse(String(calls[0].init.body)).data[0].event_id, lead.id)
})
test('provider errors and timeouts return failure without throwing or leaking credentials', async () => {
  for (const fetcher of [async () => new Response('', { status: 400 }), async () => { throw new Error('fake-token') }, async () => Response.json({ events_received: 0 })]) {
    assert.equal(await sendMetaLead({ config, lead, request: request(), origin: 'https://koliotamerika.bg', preview: false, decrypt: () => 'fake-token', fetcher }), 'failed')
  }
})
