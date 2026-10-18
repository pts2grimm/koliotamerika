import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { reserveSubmission } from '../../src/lib/submission-limit'
import { createHmac } from 'node:crypto'
const payload=await getPayload({config}),db=payload.db.drizzle,now=Date.now()
const bootstrap=payload.collections.users.config.endpoints.find(e=>e.path==='/first-register'&&e.method==='post')
assert.ok(bootstrap)
assert.equal((await bootstrap.handler({} as Parameters<typeof bootstrap.handler>[0])).status,403)
const legacyValue='198.51.100.44'
const legacyKey=createHmac('sha256',process.env.PAYLOAD_SECRET!).update(legacyValue).digest('hex')
for(let i=0;i<5;i++) await db.run(sql`INSERT INTO submission_limits (key,created_at,updated_at) VALUES (${legacyKey},${new Date(now).toISOString()},${new Date(now).toISOString()})`)
assert.equal(await reserveSubmission(payload,legacyValue,5,now),false)
await db.run(sql`DELETE FROM submission_limits`)
const value='inquiry:198.51.100.55'
const accepted=await Promise.all(Array.from({length:20},()=>reserveSubmission(payload,value,5,now)))
assert.equal(accepted.filter(Boolean).length,5)
assert.equal(await reserveSubmission(payload,value,5,now),false)
const rows=await db.all<{key:string}>(sql`SELECT key FROM submission_limits`)
assert.equal(rows.length,5)
assert.ok(rows.every(r=>r.key===createHmac('sha256',payload.config.secret).update(value).digest('hex')))
assert.equal(await reserveSubmission(payload,'another-client',5,now),true)
assert.equal(await reserveSubmission(payload,value,5,now+3600001),true)
assert.equal((await db.all(sql`SELECT id FROM submission_limits`)).length,1)
await db.run(sql`DELETE FROM submission_limits`)
await db.run(sql`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<19999)
 INSERT INTO submission_limits (key,created_at,updated_at) SELECT 'seed',${new Date(now).toISOString()},${new Date(now).toISOString()} FROM n`)
const bounded=await Promise.all(Array.from({length:10},(_,i)=>reserveSubmission(payload,'cap-'+i,5,now)))
assert.equal(bounded.filter(Boolean).length,1)
assert.equal((await db.all(sql`SELECT id FROM submission_limits`)).length,20000)
await payload.destroy()
