import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auctionSectionPath, auctionSectionRedirect, sectionFilters, sectionVehicleType } from '../src/lib/auction-sections'
import { auctionResultsURL } from '../src/lib/auction-filters'

test('section boundaries persist independently of removable query filters',()=>{
 assert.equal(sectionVehicleType('cars','Motorcycle'),'Automobile')
 assert.equal(sectionVehicleType('powersports','Automobile'),'Powersports')
 assert.equal(sectionVehicleType('powersports','ATVUTV'),'ATVUTV')
 assert.deepEqual(sectionFilters({vehicle_type:'Powersports',make:'Honda',sort:'newest'},'powersports'),{make:'Honda',sort:'newest'})
 assert.equal(auctionResultsURL({vehicle_type:'Powersports',sort:'newest'},2,auctionSectionPath('powersports')),'/targove/motori-atv?sort=newest&pagenum=2')
 assert.equal(auctionResultsURL({vehicle_type:'Automobile'},1),'/targove')
})
test('bookmarked category searches redirect with filters, page and lot lookup intact',()=>{
 assert.equal(auctionSectionRedirect({vehicle_type:'Motorcycle',make:'Honda',pagenum:'2',q:'81000000'},'cars'),'/targove/motori-atv?vehicle_type=Motorcycle&make=Honda&pagenum=2&q=81000000')
 assert.equal(auctionSectionRedirect({vehicle_type:'ATVUTV'},'cars',true),'/targove/motori-atv/arhiv?vehicle_type=ATVUTV')
 assert.equal(auctionSectionRedirect({vehicle_type:'Automobile',make:'Ford'},'powersports'),'/targove?make=Ford')
 assert.equal(auctionSectionRedirect({make:'BMW'},'cars'),null)
})
