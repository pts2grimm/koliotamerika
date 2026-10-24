import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentHint, sellerHint, mileage } from '../src/lib/vehicle-details'
import { normalizeEridanCar } from '../src/lib/auction-providers/eridan'
import { normalizeCar } from '../src/lib/auction-providers/normalize'

test('document hints distinguish pending, restricted, salvage and unknown documents', () => {
 assert.equal(documentHint('other').label, 'Талонът се чака')
 assert.equal(documentHint('Certificate of destruction (FL)').tone, 'bad')
 assert.equal(documentHint('Salvage - Parts Only').tone, 'bad')
 assert.equal(documentHint('Salvage Certificate').tone, 'warn')
 assert.equal(documentHint('Certificate of Title (GA)').tone, 'good')
 assert.equal(documentHint('Repossession Paperwork').tone, 'neutral')
})
test('provider keeps seller and state aliases without confusing vehicle title with document', () => {
 const car = normalizeCar({ lot_id: 70000000, site: 1, title: '2022 BMW X5', seller_name: 'TitleMax', sellerType: 'dealer', location_state: 'GA' })!
 assert.equal(car.seller, 'TitleMax'); assert.equal(car.state, 'GA'); assert.equal(car.seller_type, 'dealer')
 assert.equal(car.document_old, undefined)
 assert.equal(sellerHint(car.seller_type!).label, 'Частно лице')
})

test('auction mileage shows rounded kilometres first and preserves the original miles', () => {
 const format=(value?:number,unit:'mi'|'km'|'unknown'='mi')=>mileage(value,unit)?.replace(/\s/g,' ')
 assert.equal(format(51226),'82 440 км (51 226 мили)')
 assert.equal(format(0),'0 км (0 мили)')
 assert.equal(format(1),'2 км (1 мили)')
 assert.equal(format(1.5),'2 км (1,5 мили)')
 assert.equal(format(51226,'km'),'51 226 км')
 for(const value of [undefined,NaN,Infinity,-1])assert.equal(format(value),undefined)
 for(const auction of ['copart','iaai']){
  const raw={lot_number:'70000001',auction,odometer:51226}
  const car=normalizeEridanCar(raw)!
  assert.equal(car.odometer,51226)
  assert.equal(car.odometer_unit,'mi')
  assert.equal(format(car.odometer,car.odometer_unit),'82 440 км (51 226 мили)')
  const kilometres=normalizeEridanCar({...raw,odometer_unit:'km'})!
  assert.equal(format(kilometres.odometer,kilometres.odometer_unit),'51 226 км')
  assert.equal(normalizeEridanCar({...raw,odometer:null})!.odometer,undefined)
 }
})
