import { sqliteDatabase } from './sqlite-db'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { purgeExpiredConsents } from '../../src/lib/consent-audit-server'
const payload = await getPayload({ config })
const db = sqliteDatabase(payload)
const customer = await payload.create({ collection: 'customers', data: { email: 'audit-delete@example.test', password: 'Only-test-password', name: 'Retention fixture', consentedAt: new Date().toISOString() } })
const now = new Date().toISOString()
const old = new Date(Date.now() - 181 * 86400000).toISOString()
await db.run(sql`INSERT INTO consent_events (event,subject,analytics,marketing,action,policy_version,customer_id,created_at,updated_at)
 VALUES ('keep-audit','subject',0,0,'necessary_only','2026-10-17',${customer.id},${now},${now}),
 ('expire-audit','old-subject',1,1,'accept_all','2026-10-17',NULL,${old},${old})`)
await purgeExpiredConsents(payload)
assert.equal((await db.all(sql`SELECT id FROM consent_events WHERE event='expire-audit'`)).length,0)
await payload.delete({ collection: 'customers', id: customer.id })
const rows = await db.all<{ customer_id: number | null }>(sql`SELECT customer_id FROM consent_events WHERE event='keep-audit'`)
assert.equal(rows.length,1)
assert.equal(rows[0].customer_id,null)
console.log('Consent retention and customer unlinking verified')
process.exit(0)
