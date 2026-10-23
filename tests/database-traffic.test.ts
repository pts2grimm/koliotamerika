import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrafficMeter, queryLabel } from '../src/lib/database-traffic'
test('SQL labels are bounded and never retain literals, aliases, or parameter data',()=>{
 assert.deepEqual(queryLabel('select (select count(*) from "media") from "payload"."pages" where title=$1'),{table:'pages',operation:'SELECT'})
 assert.deepEqual(queryLabel("/* secret */ SELECT 'FROM users password' FROM cars"),{table:'cars',operation:'SELECT'})
 assert.deepEqual(queryLabel('select $$ from users secret $$ from pages'),{table:'pages',operation:'SELECT'})
 assert.deepEqual(queryLabel('WITH x AS (select * from users) SELECT * FROM pages'),{table:'pages',operation:'SELECT'})
 assert.deepEqual(queryLabel('INSERT INTO "payload"."catalog_guard" SELECT 1 FROM users RETURNING id'),{table:'catalog_guard',operation:'INSERT'})
 assert.deepEqual(queryLabel('select 1; select 2'),{table:'multiple',operation:'MULTIPLE'})
 assert.deepEqual(queryLabel('select * from "private@example.test"'),{table:'other',operation:'SELECT'})
})
test('snapshots contain only bounded counters; reads are detached and cannot mutate collection',()=>{
 let now=0;const m=createTrafficMeter(()=>now)
 m.record({table:'pages',operation:'SELECT'},100,2,1)
 m.record({table:'users',operation:'SELECT'},20,1,1)
 m.record({table:'secret-token',operation:'secret-sql'},-1)
 now=2000
 const first=m.snapshot()
 assert.equal(first.total.approximateBytes,120)
 assert.equal(first.total.queries,2)
 assert.equal(first.total.returnedRows,3)
 assert.equal(first.breakdown[0].table,'pages')
 assert.equal(first.measuredThrough,new Date(2000).toISOString())
 first.breakdown[0].approximateBytes=0
 assert.equal(m.snapshot().total.approximateBytes,120)
 assert(!JSON.stringify(m.snapshot()).includes('secret'))
 assert.equal(createTrafficMeter().snapshot().total.queries,0)
 assert.notEqual(createTrafficMeter().snapshot().processInstance,first.processInstance)
})
