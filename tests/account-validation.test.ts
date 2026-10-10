import test from 'node:test'
import assert from 'node:assert/strict'
import { accountEmail, validPassword, vehicleInput, vehicleURL } from '../src/lib/account-validation'
test('favorite destinations are restricted to valid local cars and auction lots', () => {
 const legacy = vehicleInput({ lot: '12345678', site: '1', title: ' BMW X5 ' })!
 assert.equal(legacy.kind, 'auction'); assert.equal(vehicleURL(legacy), '/targove/kola?lot=12345678&site=1')
 for (const slug of ['//evil.example', '../admin', 'x?redirect=evil', 'x#y', 'a/b', '<script>']) assert.equal(vehicleInput({ kind: 'car', slug, title: 'Car' }), null)
 assert.equal(vehicleInput({ lot: '12345&x=y', site: '1', title: 'Car' }), null)
 assert.equal(vehicleInput({ lot: '12345678', site: '3', title: 'Car' }), null)
 assert.equal(vehicleInput({ kind: 'car', slug: 'bmw-x5', title: 'x'.repeat(201) }), null)
})
test('account input bounds reject invalid emails and short or oversized passwords', () => {
 assert.equal(accountEmail(' Alice@Example.com '), 'alice@example.com')
 assert.equal(accountEmail('x\n@y.z'), null); assert.equal(accountEmail('not-an-email'), null)
 assert.equal(validPassword('a'.repeat(7)), false); assert.equal(validPassword('a'.repeat(8)), true); assert.equal(validPassword('a'.repeat(129)), false)
})
