import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAuctionSnapshots } from '../src/lib/auction-snapshots'
import type { AuctionCar } from '../src/lib/auction-providers/types'
const car = (lot_id: number, site = 1, current_bid = 0) => ({ id: site + ':' + lot_id, lot_id, site, current_bid, title: 'Test car', make: 'BMW', model: 'X5', year: 2023, currency: 'USD', link_img_hd: ['https://cs.copart.com/full.jpg'] } as AuctionCar)

test('catalogue snapshots preserve full images and zero bids and separate auctions', () => {
 const snapshots = createAuctionSnapshots({ now: () => 1000 })
 snapshots.remember([car(70000000), car(70000000, 2, 550)], 1000)
 assert.equal(snapshots.get('70000000', '1')?.current_bid, 0)
 assert.equal(snapshots.get('70000000', '2')?.current_bid, 550)
 assert.deepEqual(snapshots.get('70000000', '1')?.link_img_hd, ['https://cs.copart.com/full.jpg'])
 assert.equal(snapshots.get('79999999', '1'), undefined)
})

test('reading or reusing a cached catalogue cannot extend the original freshness window', () => {
 let now = 1000
 const snapshots = createAuctionSnapshots({ now: () => now })
 snapshots.remember([car(70000000)], 1000)
 now = 60999
 assert.ok(snapshots.get('70000000', '1'))
 snapshots.remember([car(70000000)], 1000)
 now = 61000
 assert.equal(snapshots.get('70000000', '1'), undefined)
 snapshots.remember([car(70000000)], 1000)
 assert.equal(snapshots.get('70000000', '1'), undefined)
})

test('an older or future catalogue snapshot cannot replace a newer bid', () => {
 const snapshots = createAuctionSnapshots({ now: () => 3000 })
 snapshots.remember([car(70000000, 1, 100)], 2000)
 snapshots.remember([car(70000000, 1, 50)], 1000)
 snapshots.remember([car(70000000, 1, 200)], 4000)
 assert.equal(snapshots.get('70000000', '1')?.current_bid, 100)
 snapshots.remember([car(70000000, 1, 300)], 3000)
 assert.equal(snapshots.get('70000000', '1')?.current_bid, 300)
})

test('snapshots evict oldest lots at the memory bound and prune expired entries', () => {
 let now = 1000
 const snapshots = createAuctionSnapshots({ now: () => now, limit: 2 })
 snapshots.remember([car(70000000), car(70000001), car(70000002)], now)
 assert.equal(snapshots.get('70000000', '1'), undefined)
 assert.ok(snapshots.get('70000001', '1'))
 now = 61000
 snapshots.remember([car(70000003)], now)
 assert.equal(snapshots.get('70000001', '1'), undefined)
 assert.equal(snapshots.get('70000002', '1'), undefined)
 assert.ok(snapshots.get('70000003', '1'))
})
