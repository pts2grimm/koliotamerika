import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auctionFormURL, auctionResultsURL, readAuctionFilters } from '../src/lib/auction-filters'
test('filter submission preserves literal values once and removes empty fields, defaults and stale page/search',()=>{
 const data=new FormData()
 for(const [key,value] of Object.entries({make:'BMW',model:'3 SERIES',year_from:'',year_to:'',site:'1,2',status:'Run & Drive',fuel:'',seller:'',seller_type:'insurance',pagenum:'8',q:'57397516'}))data.append(key,value)
 const url=auctionFormURL(data)
 assert.equal(url,'/targove?make=BMW&model=3+SERIES&status=Run+%26+Drive&seller_type=insurance')
 assert.equal(new URL(url,'https://example.test').searchParams.get('status'),'Run & Drive')
 data.set('make','')
 assert.equal(auctionFormURL(data),'/targove?status=Run+%26+Drive&seller_type=insurance')
})
test('changed values replace duplicates and pagination carries only the current filters',()=>{
 const form=new FormData()
 form.append('make','Ford');form.append('make','BMW')
 form.append('site','1');form.append('site','2')
 form.append('seller_type','insurance');form.append('seller_type','dealer')
 assert.equal(auctionFormURL(form,'/targove/arhiv'),'/targove/arhiv?make=BMW&site=2&seller_type=dealer')
 const filters=readAuctionFilters({make:['Ford','BMW'],site:'1,2',model:'X5',seller_type:'dealer',fuel:''})
 assert.equal(auctionResultsURL(filters,2),'/targove?make=BMW&model=X5&seller_type=dealer&pagenum=2')
 assert.equal(auctionFormURL(new FormData()),'/targove')
})

test('sort survives filters and pagination, resets the page on change and rejects arbitrary ordering',()=>{
 const filters=readAuctionFilters({make:'BMW',sort:'auction_soon',vehicle_type:'Automobile'})
 assert.equal(auctionResultsURL(filters,3),'/targove?make=BMW&sort=auction_soon&pagenum=3')
 const form=new FormData()
 for(const [key,value] of Object.entries({...filters,sort:'year_desc',pagenum:'3'}))form.append(key,value)
 assert.equal(auctionFormURL(form),'/targove?make=BMW&sort=year_desc')
 assert.equal(auctionResultsURL({make:'BMW',sort:'unknown'}),'/targove?make=BMW')
})
