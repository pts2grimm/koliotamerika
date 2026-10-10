import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

const payload = await getPayload({ config })
const invalid = (error: unknown) => error instanceof Error && error.name === 'ValidationError'
try {
 // Bootstrap itself must accept eight characters.
 assert.ok((await payload.login({ collection: 'users', data: { email: process.env.INITIAL_ADMIN_EMAIL!, password: process.env.INITIAL_ADMIN_PASSWORD! } })).token)
 for (const collection of ['users', 'customers'] as const) {
  const email = collection + '@example.test'
  const data = { email, name: 'Policy test', consentedAt: new Date().toISOString(), password: 'short77' }
  await assert.rejects(payload.create({ collection, data }), invalid)
  const user = await payload.create({ collection, data: { ...data, password: 'eight888' } })
  assert.ok((await payload.login({ collection, data: { email, password: 'eight888' } })).token)
  await assert.rejects(payload.update({ collection, id: user.id, data: { password: 'short77' } }), invalid)
  await payload.update({ collection, id: user.id, data: { name: 'Updated name' } })
  assert.ok((await payload.login({ collection, data: { email, password: 'eight888' } })).token)
  await payload.update({ collection, id: user.id, data: { password: 'updated8' } })
  assert.ok((await payload.login({ collection, data: { email, password: 'updated8' } })).token)
  const token = await payload.forgotPassword({ collection, data: { email }, disableEmail: true })
  assert.equal(typeof token, 'string')
  await assert.rejects(payload.resetPassword({ collection, overrideAccess: true, data: { token: token!, password: 'short77' } }), invalid)
  await payload.resetPassword({ collection, overrideAccess: true, data: { token: token!, password: 'reset888' } })
  assert.ok((await payload.login({ collection, data: { email, password: 'reset888' } })).token)
 }
} finally { await payload.destroy() }
process.exit(0)
