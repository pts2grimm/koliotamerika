import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalEridanSearch as key } from '../src/lib/auction-cache-key'
test('equivalent filters share keys without collapsing effective filters',()=>{
 const a=key('make=BMW&site=1,2&model=&year_from=&year_to=&page=1&size=12')
 assert.equal(a,key('size=12&site=2,1,1&make=BMW'))
 assert.equal(a,key('make=BMW&site=1,2&sort=auction_soon&fuel='))
 for(const suffix of ['model=3+SERIES','year_from=2013','year_to=2020','status=Run+%26+Drive','seller_type=insurance','seller=Test','cylinders=4','vehicle_type=ATVUTV','fuel=Diesel','page=2','size=24','sort=year_desc','archive=ended']){
  assert.notEqual(a,key('make=BMW&site=1,2&'+suffix),suffix)
 }
 assert.notEqual(a,key('make=BMW&site=1'))
 assert.equal(key('make=MERCEDES+BENZ'),key('make=MERCEDES-BENZ'))
 assert.equal(key('archive=sold'),key('archive=ended'))
})
test('invalid input is retained for validation and duplicates preserve first-value semantics',()=>{
 assert.match(key('site=3'),/site=3/)
 assert.match(key('status=broken'),/status=broken/)
 assert.match(key('cylinders=broken'),/cylinders=broken/)
 assert.equal(key('make=BMW&make=AUDI'),key('make=BMW'))
 assert.equal(key('model=&model=M3'),key(''))
 assert.notEqual(key('site=1'),key('site=2'))
})
