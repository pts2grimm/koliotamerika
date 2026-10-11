import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { integrationSecrets, decryptIntegrationToken } from '../../src/lib/integration-secrets'
const payload = await getPayload({ config })
try {
  const token = 'test-only-never-a-live-token'
  let result = await payload.updateGlobal({ slug: 'integrations', data: {
    enabled: false, hostname: 'koliotamerika.bg', installation: 'direct', pixelId: '12345678901', metaAccessToken: token,
  } })
  assert.equal(result.metaAccessToken, '')
  assert.equal(result.tokenConfigured, true)
  const readSecret = () => payload.findGlobal({ slug: 'integrations', context: { integrationSecrets } })
  let privateConfig = await readSecret()
  assert.notEqual(privateConfig.metaAccessToken, token)
  assert.equal(decryptIntegrationToken(privateConfig.metaAccessToken!), token)
  const ciphertext = privateConfig.metaAccessToken
  await payload.updateGlobal({ slug: 'integrations', data: { gaId: 'G-TEST12345', metaAccessToken: '' } })
  privateConfig = await readSecret()
  assert.equal(privateConfig.metaAccessToken, ciphertext)
  assert.equal((await payload.findGlobal({ slug: 'integrations' })).metaAccessToken, '')
  await assert.rejects(payload.findGlobal({ slug: 'integrations', overrideAccess: false }))
  const customer = await payload.create({ collection: 'customers', data: { name: 'Test', email: 'integrations-customer@example.test', phone: '+359888123456', password: 'test8888' } })
  await assert.rejects(payload.findGlobal({ slug: 'integrations', overrideAccess: false, user: { ...customer, collection: 'customers' } }))
  await assert.rejects(payload.updateGlobal({ slug: 'integrations', overrideAccess: false, user: { ...customer, collection: 'customers' }, data: { enabled: true } }))
  await assert.rejects(payload.updateGlobal({ slug: 'integrations', data: { gaId: '<script>alert(1)</script>' } }))
  result = await payload.updateGlobal({ slug: 'integrations', data: { clearMetaToken: true } })
  assert.equal(result.tokenConfigured, false)
  assert.equal((await readSecret()).metaAccessToken, null)
  console.log('Integration encryption, blank-save preservation, clearing, validation and staff-only access passed.')
} finally { await payload.destroy() }
