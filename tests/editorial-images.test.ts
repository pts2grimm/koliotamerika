import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import artwork from '../content/editorial-images.json'
import { editorialImage } from '../src/lib/editorial-images'

test('editorial artwork is a fallback and never displaces CMS or migrated images', () => {
 const slug = artwork[0].slug
 assert.equal(editorialImage(slug).src, artwork[0].src)
 assert.equal(editorialImage(slug, '/uploaded.webp', '/legacy.webp').src, '/uploaded.webp')
 assert.equal(editorialImage(slug, '/uploaded.webp').artwork, undefined)
 assert.equal(editorialImage(slug, undefined, '/legacy.webp').src, '/legacy.webp')
 assert.equal(editorialImage(slug, undefined, '/legacy.webp').artwork, undefined)
 assert.equal(editorialImage('unrelated-page').src, undefined)
 assert.equal(editorialImage('toString').src, undefined)
})

test('editorial cover files exist with their declared PNG dimensions and descriptions', () => {
 const seen = new Set<string>()
 for (const image of artwork) {
  assert.ok(!seen.has(image.slug))
  seen.add(image.slug)
  assert.match(image.src, /^\/images\/editorial\/[a-z-]+\.png$/)
  assert.ok(image.alt.length > 20 && image.caption.includes('AI') && image.provenance)
  const bytes = readFileSync(new URL('../public' + image.src, import.meta.url))
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(bytes.readUInt32BE(16), image.width)
  assert.equal(bytes.readUInt32BE(20), image.height)
 }
})
