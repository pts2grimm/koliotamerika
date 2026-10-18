import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogTotalData, validateCatalogTotal } from '../src/lib/catalog-totals'
const search={kind:'search' as const,section:'cars' as const,archive:false,make:'BMW',model:'3 SERIES',outcome:'results' as const,resultCount:20,vin:'WBS8M9C59J5J79848',query:'12345678',filters:{seller:'Someone',year_from:'2018'}}
test('aggregate projection removes identifiers, raw queries and detailed filters',()=>{
 const value=catalogTotalData(search)
 assert.deepEqual(value,{kind:'search',section:'cars',archive:false,make:'BMW',model:'3 SERIES',lot:'',site:'',outcome:'results'})
 assert.deepEqual(validateCatalogTotal(value),value)
 assert.equal(catalogTotalData({...search,make:'private@example.test',model:'John Smith'}).make,'')
 assert.equal(catalogTotalData({...search,make:'private@example.test',model:'John Smith'}).model,'')
 assert.equal(catalogTotalData({...search,model:'WBS8M9C59J5J79848'}).model,'')
})
test('view counters accept lot/site but never VIN, session, customer or event IDs',()=>{
 const view=catalogTotalData({...search,kind:'view',lot:'12345678',site:'2'})
 assert.equal(view.outcome,'')
 assert.equal(view.lot,'12345678')
 assert.deepEqual(validateCatalogTotal(view),view)
 for(const key of ['event','receipt','subject','customer','vin','query','ip','userAgent','createdAt','url','filters']) assert.equal(validateCatalogTotal({...view,[key]:'forbidden'}),null,key)
})
test('malformed or potentially identifying fields fail closed',()=>{
 const value=catalogTotalData(search)
 for(const patch of [{kind:['search']},{make:'<script>'},{make:'a@example.test'},{make:'HTTP://EXAMPLE.COM'},{model:'X'.repeat(101)},{lot:'12345678'},{site:'1'},{outcome:'wrong'},{archive:'false'},{make:undefined}]) assert.equal(validateCatalogTotal({...value,...patch}),null,JSON.stringify(patch))
 assert.equal(validateCatalogTotal({...value,kind:'view'}),null)
 assert.equal(validateCatalogTotal(null),null)
})
