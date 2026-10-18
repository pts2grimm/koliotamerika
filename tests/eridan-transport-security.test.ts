import test from 'node:test'
import assert from 'node:assert/strict'
import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'

test('slow upstream burst has bounded queue/concurrency and recovers after draining', async()=>{
 let release!:()=>void
 const gate=new Promise<void>(resolve=>{release=resolve})
 let calls=0,active=0,peak=0
 const transport=createEridanTransport({apiKey:'fixture-only',fetch:async()=>{
  calls++;active++;peak=Math.max(peak,active)
  await gate
  active--
  return {ok:true,status:200,json:async()=>({ok:true})}
 }})
 const pending=Promise.allSettled(Array.from({length:40},()=>transport('/lots',new URLSearchParams())))
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(calls,2)
 release()
 const results=await pending
 assert.equal(results.filter(r=>r.status==='fulfilled').length,34)
 const rejected=results.filter(r=>r.status==='rejected')
 assert.equal(rejected.length,6)
 assert.ok(rejected.every(r=>r.status==='rejected'&&r.reason.message==='Eridan request queue is full'))
 assert.equal(peak,2)
 assert.deepEqual(await transport('/lots',new URLSearchParams()),{ok:true})
})
