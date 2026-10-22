import { sqliteDatabase } from './sqlite-db'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { reserveCatalogRequest, purgeCatalogGuard } from '../../src/lib/catalog-guard-server'

const payload=await getPayload({config}),db=sqliteDatabase(payload)
const now=Date.parse('2026-10-18T20:00:00Z')
const input={ip:'198.51.100.1',agent:'Mozilla test',scope:'vehicle',verified:'' as const}
const limits={minute:5,hour:8}
const calls=await Promise.all(Array.from({length:12},()=>reserveCatalogRequest(payload,input,now,limits)))
assert.equal(calls.filter(r=>!r.blocked).length,5)
assert.equal(calls.filter(r=>r.blocked).length,7)
assert.ok(calls.filter(r=>r.blocked).every(r=>r.retryAfter===60||r.retryAfter===3600))
const rows=await db.all<{total:number;blocked:number}>(sql`SELECT total,blocked FROM catalog_guard`)
assert.equal(rows[0].total,12);assert.equal(rows[0].blocked,7)
assert.equal((await reserveCatalogRequest(payload,input,now+60000,limits)).reason,'hour')
assert.equal((await reserveCatalogRequest(payload,input,now+3600000,limits)).blocked,false)
assert.equal((await reserveCatalogRequest(payload,{...input,ip:'198.51.100.2'},now,limits)).blocked,false)
// Even when a bot claimed exemption previously, an unverified request does not inherit it.
assert.equal((await reserveCatalogRequest(payload,{...input,verified:'Google'},now,limits)).blocked,false)
assert.equal((await reserveCatalogRequest(payload,input,now,limits)).blocked,true)
await db.run(sql`DELETE FROM catalog_guard`)
for(let i=0;i<5;i++) assert.equal((await reserveCatalogRequest(payload,{...input,ip:'2001:db8:1:2::'+(i+1)},now,limits)).blocked,false)
assert.equal((await reserveCatalogRequest(payload,{...input,ip:'2001:db8:1:2::abcd'},now,limits)).blocked,true)
await purgeCatalogGuard(payload,now+7*86400000)
assert.equal((await db.all(sql`SELECT key FROM catalog_guard`)).length,0)
// Maximum storage cannot stop existing buckets from being updated.
await db.run(sql`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<50000)
 INSERT INTO catalog_guard (key,hour,minute,minute_count,total,blocked,last_blocked,last_reason,ip,agent,scope,verified,last_seen)
 SELECT 'seed-'||x,1,1,1,1,0,0,'','', '', 'catalogue','', '2026-10-18T20:00:00Z' FROM n`)
assert.equal((await reserveCatalogRequest(payload,input,now,limits)).reason,'capacity')
await purgeCatalogGuard(payload,now)
assert.equal((await reserveCatalogRequest(payload,input,now,limits)).blocked,false)
await payload.destroy()
