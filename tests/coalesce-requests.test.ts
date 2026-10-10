import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestCoalescer } from '../src/lib/coalesce-requests'
test('concurrent identical work is shared; different pages and providers stay independent', async () => {
 const coalesce = createRequestCoalescer()
 let calls = 0, release!: (value: string) => void
 const load = () => { calls++; return new Promise<string>(resolve => { release = resolve }) }
 const requests = Array.from({ length: 8 }, () => coalesce('provider:page1', load))
 await Promise.resolve(); assert.equal(calls, 1)
 assert.equal(await coalesce('provider:page2', async () => 'second page'), 'second page')
 assert.equal(await coalesce('other-provider:page1', async () => 'other provider'), 'other provider')
 release('shared result'); assert.deepEqual(await Promise.all(requests), Array(8).fill('shared result'))
 assert.equal(await coalesce('provider:page1', async () => 'fresh result'), 'fresh result')
})
test('failed work is shared but not retained, including synchronous throws', async () => {
 const coalesce = createRequestCoalescer()
 let calls = 0
 const load = () => { calls++; throw new Error('Provider unavailable') }
 const results = await Promise.allSettled(Array.from({ length: 8 }, () => coalesce('same', load)))
 assert.equal(calls, 1); assert.ok(results.every(result => result.status === 'rejected'))
 assert.equal(await coalesce('same', async () => 'recovered'), 'recovered')
})
