import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentHint, sellerHint } from '../src/lib/vehicle-details'
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
