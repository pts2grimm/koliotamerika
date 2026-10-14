import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload } from 'payload'
import { scheduleEditorialArticles } from '../src/lib/schedule-editorial'
import schedule from '../content/editorial-schedule.json'
test('approved editorial calendar uses Sofia morning on Tuesdays/Fridays with no duplicate slugs',()=>{
 assert.equal(new Set(schedule.map(item=>item.slug)).size,schedule.length)
 for(const item of schedule){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',hour:'2-digit',minute:'2-digit',weekday:'long',hourCycle:'h23'}).format(new Date(item.publishedAt))
  assert.match(parts,/Tuesday|Friday/)
  assert.match(parts,/09:00/)
 }
})
test('schedule is Eridan-only, future-only and updates status/date without replacing content',async()=>{
 const previous=process.env.AUCTION_PROVIDER
 const calls:Record<string,any>[]=[]
 const payload={update:async(args:Record<string,any>)=>{calls.push(args);return {docs:[{id:1}]}}} as unknown as Payload
 try{
  process.env.AUCTION_PROVIDER='apicar'
  assert.equal(await scheduleEditorialArticles(payload,0),0);assert.equal(calls.length,0)
  process.env.AUCTION_PROVIDER='eridan'
  assert.equal(await scheduleEditorialArticles(payload,Date.parse('2026-10-14T00:00:00Z')),3)
  for(const call of calls){
   assert.deepEqual(Object.keys(call.data).sort(),['publishedAt','status'])
   assert.ok(call.where.and.some((part:any)=>part.status?.equals==='draft'))
   assert.ok(call.where.and.some((part:any)=>part.publishedAt?.exists===false))
  }
  calls.length=0
  assert.equal(await scheduleEditorialArticles(payload,Date.parse('2026-10-24T00:00:00Z')),0)
  assert.equal(calls.length,0)
 }finally{if(previous===undefined)delete process.env.AUCTION_PROVIDER;else process.env.AUCTION_PROVIDER=previous}
})
