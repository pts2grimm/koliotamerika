import test from 'node:test'
import assert from 'node:assert/strict'
import { createExpiringCache } from '../src/lib/expiring-cache'

test('public reads share work and expire without stale-while-revalidate', async () => {
 let time=0,calls=0
 const cache=createExpiringCache({now:()=>time,ttl:30_000})
 const read=()=>cache.get('blog',async()=>++calls)
 assert.deepEqual(await Promise.all([read(),read(),read()]),[1,1,1])
 time=29_999; assert.equal(await read(),1)
 time=30_000; assert.equal(await read(),2)
 time=60_000
 await assert.rejects(cache.get('blog',async()=>{throw new Error('database unavailable')}))
 assert.equal(await read(),3)
})
test('schedule visibility is refreshed at hard expiry; misses are not permanent', async()=>{
 let now=0
 const cache=createExpiringCache({now:()=>now,ttl:30_000})
 const read=()=>cache.get('scheduled',async()=>now>=10_000?'published':null)
 assert.equal(await read(),null)
 now=9_999;assert.equal(await read(),null)
 now=30_000;assert.equal(await read(),'published')
})
test('invalidation prevents an in-flight pre-edit value refilling the cache',async()=>{
 const cache=createExpiringCache()
 let finish!:(value:string)=>void
 const old=cache.get('page',()=>new Promise<string>(resolve=>{finish=resolve}))
 await Promise.resolve()
 cache.clear()
 assert.equal(await cache.get('page',async()=>'updated'),'updated')
 finish('old');assert.equal(await old,'old')
 assert.equal(await cache.get('page',async()=>'wrong'),'updated')
})
test('failed loads are shared only in flight and retried; cached entries are bounded',async()=>{
 const cache=createExpiringCache({limit:2})
 let attempts=0
 const bad=()=>cache.get('bad',async()=>{attempts++;throw new Error('offline')})
 await Promise.all([assert.rejects(bad()),assert.rejects(bad())])
 assert.equal(attempts,1);await assert.rejects(bad());assert.equal(attempts,2)
 await cache.get('a',async()=>1);await cache.get('b',async()=>2)
 await cache.get('a',async()=>9);await cache.get('c',async()=>3)
 assert.equal(await cache.get('b',async()=>4),4)
})
test('a slow database read does not extend its original freshness deadline',async()=>{
 let now=0
 const cache=createExpiringCache({ttl:30,now:()=>now})
 assert.equal(await cache.get('slow',async()=>{now=31;return 1}),1)
 assert.equal(await cache.get('slow',async()=>2),2)
})
