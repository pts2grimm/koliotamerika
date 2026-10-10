import { mkdir } from 'node:fs/promises'
import path from 'node:path'

if (process.env.PREVIEW_MODE === 'true') throw new Error('hosting:prepare requires PREVIEW_MODE=false; refusing to initialize a temporary preview database.')

// Run explicitly against the hosting database, never the development snapshot.
for (const name of ['PAYLOAD_SECRET', 'DATABASE_URI', 'MEDIA_DIR', 'NEXT_PUBLIC_SERVER_URL']) {
  if (!process.env[name]) throw new Error(`Set ${name} in the hosting environment before initialization.`)
}
const database = process.env.DATABASE_URI!
const remote = /^(libsql|https?):\/\//i.test(database)
if (remote && !process.env.DATABASE_AUTH_TOKEN) throw new Error('Set DATABASE_AUTH_TOKEN for the remote database.')
if (!remote && (!database.startsWith('file:') || !path.isAbsolute(database.slice(5)))) {
  throw new Error('DATABASE_URI must be libsql://your-database or file:/absolute/path/on/persistent/storage/payload.db')
}
if (!path.isAbsolute(process.env.MEDIA_DIR!)) throw new Error('MEDIA_DIR must be an absolute persistent directory.')
if (!remote) await mkdir(path.dirname(database.slice(5)), { recursive: true })
await mkdir(process.env.MEDIA_DIR!, { recursive: true })
Object.assign(process.env, { NODE_ENV: 'production', PAYLOAD_MIGRATING: 'true' })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { migrations } = await import('../src/migrations')
const { initializeContent } = await import('../src/lib/initialize-content')
const payload = await getPayload({ config, disableOnInit: true })
try {
  // Payload's generic migrate API accepts unknown args; this config uses SQLite.
  await payload.db.migrate({ migrations: migrations.map(migration => ({
    name: migration.name,
    up: (args: unknown) => migration.up(args as Parameters<typeof migration.up>[0]),
    down: (args: unknown) => migration.down(args as Parameters<typeof migration.down>[0]),
  })) })
  await initializeContent(payload, { preview: false, importLegacy: true })
  console.log('Hosting database ready.')
} finally {
  await payload.destroy()
}
process.exit(0)
