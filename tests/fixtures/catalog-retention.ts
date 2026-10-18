import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { purgeCatalogActivity } from '../../src/lib/catalog-activity-server'
import { up } from '../../src/migrations/20261018_120000_catalog_events'
const payload = await getPayload({config})
const db=payload.db.drizzle
// A retry after partial DDL must neither fail nor discard events.
await up({db,payload} as Parameters<typeof up>[0])
const customer=await payload.create({collection:'customers',data:{email:'catalog-retention@example.test',password:'Isolated-password-2026',name:'Catalog fixture',consentedAt:new Date().toISOString()}})
const now=Date.now(), recent=new Date(now).toISOString(), old=new Date(now-91*86400000).toISOString()
await db.run(sql`INSERT INTO catalog_events (event,subject,customer_id,kind,section,created_at,updated_at)
 VALUES ('keep-catalog','session',${customer.id},'view','cars',${recent},${recent}),
 ('expire-catalog','old-session',NULL,'search','cars',${old},${old})`)
await up({db,payload} as Parameters<typeof up>[0])
await purgeCatalogActivity(payload,now)
assert.equal((await db.all(sql`SELECT id FROM catalog_events WHERE event='expire-catalog'`)).length,0)
await payload.delete({collection:'customers',id:customer.id})
const rows=await db.all<{customer_id:number|null}>(sql`SELECT customer_id FROM catalog_events WHERE event='keep-catalog'`)
assert.equal(rows.length,1)
assert.equal(rows[0].customer_id,null)
console.log('Catalog migration retry, retention and customer unlinking verified')
process.exit(0)
