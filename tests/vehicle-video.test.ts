import test from 'node:test'
import assert from 'node:assert/strict'
import { providerVideo, vehicleVideo } from '../src/lib/vehicle-video'
import { normalizeCar } from '../src/lib/auction-providers/normalize'
test('engine video accepts legacy field aliases, arrays, and signed extensionless media', () => {
 const url = 'https://cs.copart.com/media/engine?signature=test'
 for (const field of ['video', 'video_url', 'videoUrl', 'video_link', 'videoLink']) {
  for (const value of [url, [url]]) assert.equal(normalizeCar({ lot_id: 12345678, site: 1, [field]: value })?.video, url)
 }
 assert.equal(providerVideo({ video: '0', video_url: ['', url] }), url)
 assert.deepEqual(vehicleVideo(url), { kind: 'file', src: url })
})
test('video rejects unsafe schemes and credentials and constrains embedded players', () => {
 for (const value of ['', '0', 'javascript:alert(1)', 'data:text/html,test', 'http://example.com/clip', 'https://user:pass@example.com/clip', {}, ['url']]) assert.equal(vehicleVideo(value), undefined)
 assert.deepEqual(vehicleVideo('https://youtu.be/abcdefghijk?t=10'), { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/abcdefghijk' })
 assert.equal(vehicleVideo('https://youtube.com/watch?v=bad'), undefined)
 assert.equal(vehicleVideo('https://vimeo.com/12345/abc123')?.src, 'https://player.vimeo.com/video/12345?h=abc123')
 assert.equal(vehicleVideo('https://player.vimeo.com/video/12345?h=abc123')?.src, 'https://player.vimeo.com/video/12345?h=abc123')
 assert.equal(vehicleVideo('https://www.youtube-nocookie.com/embed/abcdefghijk')?.kind, 'embed')
})
