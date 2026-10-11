import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const report = JSON.parse(await readFile('reports/url-migration-2026-10-11/verification.json', 'utf8'))
const root = path.resolve('public')
const records = []
let totalBytes = 0
for (const entry of report.media) {
  const url = new URL(entry.oldURL)
  const pathname = decodeURIComponent(url.pathname)
  if (url.origin !== 'https://koliotamerika.bg' || !pathname.startsWith('/wp-content/uploads/') ||
      pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part === '.') ||
      !/\.(jpe?g|png|webp)$/i.test(pathname)) throw new Error('Unexpected source: ' + entry.oldURL)
  const target = path.resolve(root, '.' + pathname)
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid destination')
  let response
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) })
      if (response.ok) break
    } catch (error) { if (attempt === 2) throw error }
  }
  if (!response?.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Image unavailable: ' + entry.oldURL)
  const bytes = Buffer.from(await response.arrayBuffer())
  totalBytes += bytes.length
  if (bytes.length > 20 * 1024 * 1024 || totalBytes > 150 * 1024 * 1024) throw new Error('Unexpected image size')
  const metadata = await sharp(bytes).metadata()
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height) throw new Error('Invalid image')
  const hash = createHash('sha256').update(bytes).digest('hex')
  await mkdir(path.dirname(target), { recursive: true })
  try {
    await writeFile(target, bytes, { flag: 'wx' })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const existing = await readFile(target)
    if (createHash('sha256').update(existing).digest('hex') !== hash) throw new Error('Refusing to overwrite different media: ' + pathname)
  }
  records.push({ sourceURL: url.href, path: pathname, sha256: hash, bytes: bytes.length, width: metadata.width, height: metadata.height, format: metadata.format })
}
await writeFile('content/legacy-media.json', JSON.stringify({ capturedAt: new Date().toISOString(), records }, null, 2) + '\n')
console.log(JSON.stringify({ restoredImages: records.length, totalBytes }))
