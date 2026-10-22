export {}
// Create schema only. Never seed content or run editorial jobs during a transfer.
if (process.env.DATABASE_PROVIDER !== 'postgres') throw new Error('PostgreSQL provider required')
process.env.PAYLOAD_MIGRATING = 'true'
Object.assign(process.env, { NODE_ENV: 'production' })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { migrations } = await import('../src/migrations-postgres')
const { operationalMigration } = await import('../src/lib/postgres-operational-schema')
const payload = await getPayload({ config, disableOnInit: true })
try {
  await payload.db.migrate({ migrations: [...migrations, operationalMigration].map(migration => ({
    name: migration.name,
    up: (args: unknown) => migration.up(args as Parameters<typeof migration.up>[0]),
    down: (args: unknown) => migration.down(args as Parameters<typeof migration.down>[0]),
  })) })
} finally { await payload.destroy() }
process.exit(0)
