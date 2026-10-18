import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { sql } from '@payloadcms/db-sqlite'
import { incrementCatalogTotal, purgeCatalogTotals } from '../../src/lib/catalog-totals-server'
import { up } from '../../src/migrations/20261018_160000_catalog_totals'
import { sofiaDay, shiftDay } from '../../src/lib/admin-period'
const payload=await getPayload({config})
const db=payload.db.drizzle
const now=new Date('2026-10-17T21:30:00Z'),day=sofiaDay(now)
assert.equal(day,'2026-10-18')
const data={kind:'search' as const,section:'cars' as const,archive:false,make:'BMW',model:'X5',lot:'',site:'',outcome:'results'}
assert.ok(await incrementCatalogTotal(payload,data,now))
await up({db,payload} as Parameters<typeof up>[0])
const added=await Promise.all(Array.from({length:20},()=>incrementCatalogTotal(payload,data,now)))
assert.ok(added.every(Boolean))
let rows=await db.all<{count:number}>(sql`SELECT count FROM catalog_totals`)
assert.deepEqual(rows.map(row=>row.count),[21])
const columns=await db.all<{name:string}>(sql`PRAGMA table_info(catalog_totals)`)
assert.deepEqual(columns.map(c=>c.name),['day','kind','section','archive','make','model','lot','site','outcome','count'])
await db.run(sql`INSERT INTO catalog_totals (day,kind,section,archive,make,model,lot,site,outcome,count)
 VALUES (${shiftDay(day,-90)},'search','cars',0,'OLD','','','','empty',1),
 (${shiftDay(day,-89)},'search','cars',0,'BOUNDARY','','','','empty',1)`)
await purgeCatalogTotals(payload,now)
assert.equal((await db.all(sql`SELECT * FROM catalog_totals WHERE make='OLD'`)).length,0)
assert.equal((await db.all(sql`SELECT * FROM catalog_totals WHERE make='BOUNDARY'`)).length,1)
await db.run(sql`UPDATE catalog_totals SET count=49998 WHERE day=${day}`)
const capped=await Promise.all(Array.from({length:10},()=>incrementCatalogTotal(payload,data,now)))
assert.equal(capped.filter(Boolean).length,2)
assert.equal((await db.all<{n:number}>(sql`SELECT SUM(count) AS n FROM catalog_totals WHERE day=${day}`))[0].n,50000)
assert.equal(await incrementCatalogTotal(payload,data,now),false)
assert.equal(await incrementCatalogTotal(payload,data,new Date('2026-10-18T21:30:00Z')),true)
console.log('Daily counters: schema, repeatable migration, concurrent increments, retention, Sofia boundary and cap verified')
process.exit(0)
