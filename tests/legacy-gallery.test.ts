import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import gallery from '../content/legacy-gallery.json'
import media from '../content/legacy-media-extra.json'
import examples from '../content/legacy-examples.json'
test('recovered media retain their original paths and verified bytes',()=>{
 assert.equal(gallery.items.length,41)
 assert.equal(new Set(gallery.items.map(x=>x.brand)).size,14)
 assert.deepEqual(media.unavailable,[])
 const paths=new Set(media.records.map(x=>x.path))
 for(const photo of [...gallery.items,...Object.values(examples).flat()])assert.ok(paths.has(photo.src))
 for(const file of media.records){
  assert.ok(file.path.startsWith('/wp-content/uploads/'))
  const bytes=readFileSync('public'+file.path)
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path)
  assert.ok(file.width>0&&file.height>0)
 }
})
