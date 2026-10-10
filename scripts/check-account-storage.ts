import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createClient } from '@libsql/client'
const directory = await mkdtemp(path.join(tmpdir(), 'koa-account-storage-'))
Object.assign(process.env, { NODE_ENV: 'production', PAYLOAD_MIGRATING: 'true', PREVIEW_MODE: 'false', DATABASE_URI: `file:${directory}/database.db`, PAYLOAD_SECRET: randomBytes(48).toString('hex'), MEDIA_DIR: `${directory}/media` })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { migrations } = await import('../src/migrations')
const payload = await getPayload({ config, disableOnInit: true })
try {
 await payload.db.migrate({ migrations: migrations.slice(0, 1).map(m => ({ name: m.name, up: args => m.up(args as Parameters<typeof m.up>[0]), down: args => m.down(args as Parameters<typeof m.down>[0]) })) })
 // Insert an existing inquiry in the old schema before applying the account migration.
 const oldDB = createClient({ url: process.env.DATABASE_URI! })
 await oldDB.execute({ sql: 'INSERT INTO inquiries (name,email,phone,message,consent) VALUES (?,?,?,?,?)', args: ['Old guest', 'old@example.test', '+359888123456', 'Existing guest inquiry must survive', 1] }); oldDB.close()
 await payload.db.migrate()
 const old = await payload.find({ collection: 'inquiries', limit: 1 })
 assert.equal(old.docs[0].message, 'Existing guest inquiry must survive'); assert.equal(old.docs[0].customer, null)
 const customer = await payload.create({ collection: 'customers', data: { email: 'durable@example.test', password: randomBytes(24).toString('hex'), name: 'Durable Customer', consentedAt: new Date().toISOString() } })
 await payload.create({ collection: 'saved-vehicles', data: { customer: customer.id, key: `${customer.id}:car:bmw-x5`, kind: 'car', slug: 'bmw-x5', title: 'BMW X5' } })
 await payload.create({ collection: 'inquiries', data: { customer: customer.id, name: customer.name, email: customer.email, phone: '+359888123456', message: 'Customer inquiry must survive', consent: true } })
 await payload.db.migrate() // Must be a no-op; no table recreation or duplicate records.
 assert.equal((await payload.count({ collection: 'customers' })).totalDocs, 1)
 assert.equal((await payload.count({ collection: 'saved-vehicles' })).totalDocs, 1)
 await payload.destroy()
 // A new connection reads committed data after the application connection has closed.
 const reopened = createClient({ url: process.env.DATABASE_URI! })
 assert.equal((await reopened.execute('SELECT count(*) AS n FROM customers')).rows[0].n, 1)
 assert.equal((await reopened.execute('SELECT count(*) AS n FROM saved_vehicles')).rows[0].n, 1)
 assert.equal((await reopened.execute('SELECT count(*) AS n FROM inquiries')).rows[0].n, 2)
 reopened.close()
 console.log('PASS: old inquiries preserved; migrations repeat safely; customer, favorite and inquiry persist after connection restart.')
} finally { await payload.destroy(); await rm(directory, { recursive: true, force: true }) }
process.exit(0)
