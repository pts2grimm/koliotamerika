import { sqliteDatabase } from './sqlite-db'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { catalogRequestRecord } from '../../src/lib/catalog-requests'
import { insertCatalogRequest, purgeCatalogRequests } from '../../src/lib/catalog-requests-server'
import { up } from '../../src/migrations/20261018_200000_catalog_request_details'
const payload=await getPayload({config}),db=sqliteDatabase(payload)
const now=Date.now()
const row=catalogRequestRecord({kind:'view',provider:'eridan',params:new URLSearchParams({lot:'70000000',site:'1'}),requestIP:{address:'198.51.100.10',source:'x-real-ip'}},{make:'BMW',model:'X5',vin:'WBS8M9C59J5J79848',count:1},now,false,now+100)
assert.equal(await insertCatalogRequest(payload,row),true)
await up({db,payload} as Parameters<typeof up>[0])
assert.equal((await db.all<{n:number}>(sql`SELECT COUNT(*) AS n FROM catalog_requests`))[0].n,1)
const columns=await db.all<{name:string}>(sql`PRAGMA table_info(catalog_requests)`)
assert.deepEqual(columns.map(c=>c.name),['id','created_at','kind','provider','make','model','lot','site','year_from','year_to','page','outcome','result_count','duration_ms','vin','ip','ip_source'])
assert.deepEqual(await db.all(sql`SELECT vin,ip,ip_source FROM catalog_requests`),[{vin:'WBS8M9C59J5J79848',ip:'198.51.100.10',ip_source:'x-real-ip'}])
// Reproduce an old database and an interrupted additive migration in this isolated fixture.
await db.run(sql`ALTER TABLE catalog_requests DROP COLUMN ip_source`)
await db.run(sql`ALTER TABLE catalog_requests DROP COLUMN ip`)
await up({db,payload} as Parameters<typeof up>[0])
await up({db,payload} as Parameters<typeof up>[0])
assert.deepEqual(await db.all(sql`SELECT vin,ip,ip_source,lot FROM catalog_requests`),[{vin:'WBS8M9C59J5J79848',ip:'',ip_source:'',lot:'70000000'}])
await db.run(sql`UPDATE catalog_requests SET created_at=${new Date(now-31*86400000).toISOString()}`)
await purgeCatalogRequests(payload,now)
assert.equal((await db.all(sql`SELECT id FROM catalog_requests`)).length,0)
assert.equal(await insertCatalogRequest(payload,row),true)
await db.run(sql`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<49997)
 INSERT INTO catalog_requests (created_at,kind,provider,make,model,lot,site,year_from,year_to,page,outcome,result_count,duration_ms)
 SELECT ${row.createdAt},'view','eridan','BMW','X5','70000000','1','','',1,'results',1,100 FROM n`)
const written=await Promise.all(Array.from({length:10},()=>insertCatalogRequest(payload,row)))
assert.equal(written.filter(Boolean).length,2)
assert.equal((await db.all<{n:number}>(sql`SELECT COUNT(*) AS n FROM catalog_requests`))[0].n,50000)
assert.equal(await insertCatalogRequest(payload,row),false)
await payload.destroy()
