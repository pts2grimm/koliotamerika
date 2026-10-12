import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auctionPrefetchKey, createAuctionPrefetchBudget } from '../src/lib/auction-prefetch'
const href=(lot:number)=>'/targove/kola?lot='+lot+'&site=1'
test('only exact local lot URLs can be prepared, with canonical keys across parameter order',()=>{
 assert.equal(auctionPrefetchKey('/targove/kola?site=1&lot=70000000'),href(70000000))
 for(const value of ['https://other.test/targove/kola?lot=70000000&site=1','//other.test','/admin','/targove','/targove/kola?lot=70000000&site=3','/targove/kola?lot=70000000&lot=70000001&site=1','/targove/kola?lot=70000000&site=1&redirect=other'])assert.equal(auctionPrefetchKey(value),undefined)
})
test('intent prefetch is limited to two distinct lots per minute without duplicates',()=>{
 let now=1000
 const budget=createAuctionPrefetchBudget(()=>now)
 assert.equal(budget.claim(href(70000000)),true)
 assert.equal(budget.claim('/targove/kola?site=1&lot=70000000'),false)
 assert.equal(budget.claim(href(70000001)),true)
 assert.equal(budget.claim(href(70000002)),false)
 now+=60000
 assert.equal(budget.claim(href(70000002)),true)
 assert.equal(budget.claim(href(70000000)),false)
})
test('prepared auction pages are considered expired after fifteen seconds',()=>{
 let now=1000
 const budget=createAuctionPrefetchBudget(()=>now)
 assert.equal(budget.expired(href(70000000)),false)
 budget.claim(href(70000000))
 now+=14999
 assert.equal(budget.expired(href(70000000)),false)
 now++
 assert.equal(budget.expired(href(70000000)),true)
})
