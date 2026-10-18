import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { validateCatalogActivity, catalogRetentionDays } from '../src/lib/catalog-activity'
const envelope = (data: Record<string,unknown>) => ({ event:randomUUID(), receipt:randomUUID(), data })
const search = { kind:'search', section:'cars', archive:false, make:'BMW', model:'3 SERIES', yearFrom:'2018', outcome:'results', resultCount:25, filters:{ make:'BMW',model:'3 SERIES',cylinders:'4',site:'1,2' } }
test('searches preserve grouped models and normalize filters', () => {
 const result=validateCatalogActivity(envelope(search))!
 assert.equal(result.data.model,'3 SERIES')
 assert.equal(result.data.filters?.cylinders,'4')
 assert.equal(result.data.filters?.site,undefined)
 assert.equal(result.data.resultCount,25)
 assert.equal(catalogRetentionDays,90)
})
test('views require a real lot and auction; VIN is normalized when present',()=>{
 assert.equal(validateCatalogActivity(envelope({kind:'view',section:'cars',archive:false})),null)
 const view=validateCatalogActivity(envelope({kind:'view',section:'powersports',archive:true,lot:'12345678',site:'2',vin:'wbs8m9c59j5j79848'}))!
 assert.equal(view.data.vin,'WBS8M9C59J5J79848')
 assert.equal(view.data.site,'2')
})
test('reject identity, raw URLs, seller names, arbitrary query and malformed field values',()=>{
 for(const patch of [
  {customer:42},{ip:'192.0.2.1'},{url:'https://example.test/?email=private@example.test'},
  {filters:{seller:'Private Seller'}},{query:'someone@example.test'},{make:'<script>'},
  {make:'A'.repeat(101)},{yearFrom:'2026<script>'},{resultCount:-1},{resultCount:1.5},
  {kind:['search']},{section:['cars']},{outcome:['results']},{filters:{make:{name:'BMW'}}},
  {vin:'INVALIDVIN'},{site:'3'},{archive:'false'},
 ]) assert.equal(validateCatalogActivity(envelope({...search,...patch})),null,JSON.stringify(patch))
 assert.equal(validateCatalogActivity({...envelope(search),customer:1}),null)
 assert.equal(validateCatalogActivity({...envelope(search),receipt:'persistent-identity'}),null)
 assert.equal(validateCatalogActivity(null),null)
})
test('no-results and failed searches remain distinct; valid VIN/lot queries are allowed',()=>{
 for(const outcome of ['empty','error']) {
  const result=validateCatalogActivity(envelope({...search,outcome,resultCount:0,query:'12345678'}))
  assert.equal(result?.data.outcome,outcome)
 }
})
