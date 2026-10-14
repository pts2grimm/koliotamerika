import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
if (!process.env.DATABASE_URI?.startsWith('file:/tmp/koa-smtp-')) throw new Error('Isolated SMTP test database required')
const payload = await getPayload({ config })
try {
 if (process.argv[2] === 'seed') {
  await payload.updateGlobal({ slug: 'site-settings', data: { email: 'office@example.test' } })
 } else {
  const result = await payload.find({ collection: 'inquiries', limit: 10 })
  assert.equal(result.totalDocs, 3)
  assert.deepEqual(result.docs.map(doc => doc.message).sort(), ['SMTP acceptance test', 'SMTP refusal test', 'SMTP timeout test'].sort())
  console.log('All three inquiries persisted, including SMTP refusal and timeout.')
 }
} finally { await payload.destroy() }
process.exit(0)
