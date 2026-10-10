import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Run explicitly against the hosting database, never the development snapshot.
for (const name of ['PAYLOAD_SECRET', 'DATABASE_URI', 'MEDIA_DIR', 'NEXT_PUBLIC_SERVER_URL']) {
  if (!process.env[name]) throw new Error(`Set ${name} in the hosting environment before initialization.`)
}
const database = process.env.DATABASE_URI!
if (!database.startsWith('file:') || !path.isAbsolute(database.slice(5))) {
  throw new Error('DATABASE_URI must be file:/absolute/path/on/persistent/storage/payload.db')
}
if (!path.isAbsolute(process.env.MEDIA_DIR!)) throw new Error('MEDIA_DIR must be an absolute persistent directory.')
await mkdir(path.dirname(database.slice(5)), { recursive: true })
await mkdir(process.env.MEDIA_DIR!, { recursive: true })
Object.assign(process.env, { NODE_ENV: 'production', PAYLOAD_MIGRATING: 'true' })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { seed } = await import('../src/lib/seed')
const { importContent } = await import('../src/lib/import-content')
const payload = await getPayload({ config, disableOnInit: true })
try {
  await payload.db.migrate()
  await seed(payload)
  console.log(`Hosting database ready. Imported ${await importContent(payload)} new pages/articles.`)
} finally {
  await payload.destroy()
}
process.exit(0)
