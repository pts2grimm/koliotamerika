import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogRequestRecord, runCatalogRequest, type CatalogRequestRecord } from '../src/lib/catalog-requests'
test('server records retain only allowlisted vehicle fields, never identity or raw query',()=>{
 const p=new URLSearchParams({make:'bmw',model:'x5',page:'2',year_from:'2020',site:'1',lot:'70000000',q:'WBS8M9C59J5J79848',vin:'WBS8M9C59J5J79848',seller:'Person',email:'private@example.test',customer:'7',ip:'127.0.0.1',token:'secret'})
 const row=catalogRequestRecord({kind:'search',provider:'eridan',params:p},{count:12},1000,false,1250)
 assert.deepEqual(row,{createdAt:'1970-01-01T00:00:01.000Z',kind:'search',provider:'eridan',make:'BMW',model:'X5',lot:'70000000',site:'1',yearFrom:'2020',yearTo:'',page:2,outcome:'results',resultCount:12,durationMs:250})
 assert.doesNotMatch(JSON.stringify(row),/secret|private|Person|WBS8|customer|127.0/)
 const invalid=catalogRequestRecord({kind:'lookup',provider:'token-secret',params:new URLSearchParams({make:'private@example.test',model:'WBS8M9C59J5J79848',lot:'not-a-lot',site:'4',page:'Infinity',year_from:'tomorrow'})},{count:NaN},1000,true,900)
 assert.equal(invalid.make,'');assert.equal(invalid.model,'');assert.equal(invalid.lot,'')
 assert.equal(invalid.site,'');assert.equal(invalid.yearFrom,'');assert.equal(invalid.page,1)
 assert.equal(invalid.provider,'unknown');assert.equal(invalid.outcome,'error');assert.equal(invalid.resultCount,null);assert.equal(invalid.durationMs,0)
})
test('recording failure never changes successful or failed provider results',async()=>{
 const input={kind:'view' as const,provider:'legacy',params:new URLSearchParams({lot:'70000024',site:'2'})}
 const car={make:'BMW',model:'X5',count:1}, error=new Error('provider private body')
 assert.equal(await runCatalogRequest(input,async()=>car,x=>x,()=>{throw new Error('storage')}),car)
 await assert.rejects(runCatalogRequest(input,async()=>{throw error},()=>({}),()=>{throw new Error('storage')}),e=>e===error)
 const rows:CatalogRequestRecord[]=[]
 await assert.rejects(runCatalogRequest(input,async()=>{throw error},()=>({}),r=>rows.push(r)),e=>e===error)
 assert.equal(rows[0].outcome,'error');assert.doesNotMatch(JSON.stringify(rows),/private body/)
 await runCatalogRequest(input,async()=>undefined,()=>({count:0}),r=>rows.push(r))
 assert.equal(rows[1].outcome,'empty')
})
