import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload } from 'payload'
import { scheduleEditorialArticles } from '../src/lib/schedule-editorial'
import schedule from '../content/editorial-schedule.json'
test('approved editorial calendar preserves legacy slots and uses Sofia mornings on Mondays/Wednesdays/Fridays',()=>{
 assert.equal(new Set(schedule.map(item=>item.slug)).size,schedule.length)
 assert.equal(new Set(schedule.map(item=>item.publishedAt)).size,schedule.length)
 assert.deepEqual(schedule.slice(0,4), [
  {slug:'title-pending-copart-dokumenti',publishedAt:'2026-10-16T06:00:00.000Z'},
  {slug:'proverka-servizni-akcii-vin-sasht',publishedAt:'2026-10-23T06:00:00.000Z'},
  {slug:'probeg-actual-not-actual-exempt',publishedAt:'2026-10-27T07:00:00.000Z'},
  {slug:'manheim-indeks-septemvri-2026',publishedAt:'2026-10-30T07:00:00.000Z'},
 ])
 for(const item of schedule){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',hour:'2-digit',minute:'2-digit',weekday:'long',hourCycle:'h23'}).format(new Date(item.publishedAt))
  assert.match(parts,Date.parse(item.publishedAt)<Date.parse('2026-10-28T00:00:00Z')?/Tuesday|Friday/:/Monday|Wednesday|Friday/)
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
  assert.equal(await scheduleEditorialArticles(payload,Date.parse('2026-10-14T00:00:00Z')),schedule.length)
  for(const call of calls){
   assert.deepEqual(Object.keys(call.data).sort(),['publishedAt','status'])
   assert.ok(call.where.and.some((part:any)=>part.status?.equals==='draft'))
   assert.ok(call.where.and.some((part:any)=>part.publishedAt?.exists===false))
  }
  calls.length=0
  const remaining=schedule.filter(item=>Date.parse(item.publishedAt)>Date.parse('2026-10-24T00:00:00Z'))
  assert.equal(await scheduleEditorialArticles(payload,Date.parse('2026-10-24T00:00:00Z')),remaining.length)
  assert.equal(calls.length,remaining.length)
  assert.deepEqual(calls.map(call=>call.data.publishedAt),remaining.map(item=>item.publishedAt))
  calls.length=0
  assert.equal(await scheduleEditorialArticles(payload,Date.parse('2030-01-01T00:00:00Z')),0)
  assert.equal(calls.length,0)
 }finally{if(previous===undefined)delete process.env.AUCTION_PROVIDER;else process.env.AUCTION_PROVIDER=previous}
})
