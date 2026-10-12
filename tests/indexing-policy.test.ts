import assert from 'node:assert/strict'
import test from 'node:test'
import { canIndexHost } from '../src/lib/indexing-policy'

const options = { siteURL: 'https://koliotamerika.bg', indexable: 'true', preview: 'false' }
test('only the configured public host is indexable', () => {
 assert.equal(canIndexHost('koliotamerika.bg', options), true)
 for (const host of [null, 'www.koliotamerika.bg', 'other.example', 'papayawhip-ram-220810.hostingersite.com', 'koliotamerika.bg/extra', 'user@koliotamerika.bg']) assert.equal(canIndexHost(host, options), false, String(host))
 assert.equal(canIndexHost('localhost:3100', { ...options, siteURL: 'http://localhost:3100' }), true)
})
test('indexing stays disabled during staging and for Hostinger temporary domains even when misconfigured', () => {
 assert.equal(canIndexHost('koliotamerika.bg', { ...options, indexable: 'false' }), false)
 assert.equal(canIndexHost('koliotamerika.bg', { ...options, preview: 'true' }), false)
 assert.equal(canIndexHost('demo.hostingersite.com', { ...options, siteURL: 'https://demo.hostingersite.com' }), false)
 assert.equal(canIndexHost('koliotamerika.bg', { ...options, siteURL: 'invalid' }), false)
})
