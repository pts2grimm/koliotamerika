import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const initial = readFileSync(path.join(root, 'src/migrations/20261010_120440_initial.ts'), 'utf8')
const accounts = readFileSync(path.join(root, 'src/migrations/20261010_135337_customer_accounts.ts'), 'utf8')

// Use the real schema to reproduce deployments interrupted between SQL statements.
function statements(source: string) {
  return [...source.split('export async function down')[0].matchAll(/await db\.run\(sql`((?:\\[\s\S]|[^`])*)`\)/g)]
    .map(match => match[1].replaceAll('\\`', '`'))
}
function sandbox() {
  const dir = mkdtempSync(path.join(tmpdir(), 'koa-migrations-'))
  const filename = path.join(dir, 'payload.db')
  mkdirSync(path.join(dir, 'media'))
  // Explicit environment: never inherit live database credentials or API keys.
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    PREVIEW_MODE: 'false',
    DATABASE_URI: `file:${filename}`,
    MEDIA_DIR: path.join(dir, 'media'),
    PAYLOAD_SECRET: 'isolated-migration-regression-secret-only',
    NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000',
    INITIAL_ADMIN_EMAIL: 'new-admin@example.test',
    INITIAL_ADMIN_PASSWORD: 'eight888',
  }
  const run = (script = 'scripts/prepare-hosting.ts') => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
      cwd: root, env, encoding: 'utf8', timeout: 120_000,
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
  return { dir, filename, run }
}
function journal(db: DatabaseSync) {
  assert.deepEqual(db.prepare('SELECT name FROM payload_migrations ORDER BY name').all().map(row => row.name), [
    '20261010_120440_initial', '20261010_135337_customer_accounts',
  ])
  for (const name of ['pages', 'site_settings', 'customers', 'saved_vehicles', 'inquiries']) {
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
  }
}
function insertExistingUser(db: DatabaseSync) {
  db.exec("INSERT INTO users (id, name, email, salt, hash) VALUES (42, 'Existing admin', 'existing@example.test', 'keep-salt', 'keep-hash')")
  db.exec("INSERT INTO users_sessions (_order, _parent_id, id, created_at, expires_at) VALUES (1, 42, 'keep-session', '2026-10-10', '2099-01-01')")
}
function existingUserPreserved(db: DatabaseSync) {
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n, 1)
  assert.deepEqual({ ...db.prepare('SELECT id, email, salt, hash FROM users').get() }, {
    id: 42, email: 'existing@example.test', salt: 'keep-salt', hash: 'keep-hash',
  })
  assert.equal(db.prepare('SELECT id FROM users_sessions').get()?.id, 'keep-session')
}

test('empty production startup and explicit preparation are repeatable', { timeout: 300_000 }, () => {
  const { dir, filename, run } = sandbox()
  try {
    run('tests/fixtures/initialize-database.ts')
    let db = new DatabaseSync(filename)
    journal(db)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n, 1)
    db.close()
    run()
    db = new DatabaseSync(filename)
    const count = db.prepare('SELECT COUNT(*) AS n FROM pages').get()?.n
    assert.ok(Number(count) >= 42)
    const hash = db.prepare('SELECT hash FROM users').get()?.hash
    db.exec("UPDATE pages SET title = 'Editorial title' WHERE slug = 'kak-rabotim'")
    db.exec("UPDATE site_settings SET phone = '', email = 'edited@example.test'")
    db.close()
    run()
    run('tests/fixtures/initialize-database.ts')
    db = new DatabaseSync(filename)
    journal(db)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pages').get()?.n, count)
    assert.equal(db.prepare('SELECT hash FROM users').get()?.hash, hash)
    assert.equal(db.prepare("SELECT title FROM pages WHERE slug = 'kak-rabotim'").get()?.title, 'Editorial title')
    assert.deepEqual({ ...db.prepare('SELECT phone, email FROM site_settings').get() }, { phone: '', email: 'edited@example.test' })
    db.close()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('users-only database without a migration journal recovers without changing auth data', { timeout: 300_000 }, () => {
  const { dir, filename, run } = sandbox()
  try {
    let db = new DatabaseSync(filename)
    for (const statement of statements(initial)) {
      if (statement.includes('CREATE TABLE IF NOT EXISTS `media`')) break
      db.exec(statement)
    }
    insertExistingUser(db)
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'payload_migrations'").get(), undefined)
    db.close()
    run()
    run('tests/fixtures/initialize-database.ts')
    db = new DatabaseSync(filename)
    journal(db)
    existingUserPreserved(db)
    db.close()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('interrupted customer migration resumes after already-added columns', { timeout: 300_000 }, () => {
  const { dir, filename, run } = sandbox()
  try {
    let db = new DatabaseSync(filename)
    for (const statement of statements(initial)) db.exec(statement)
    insertExistingUser(db)
    db.exec("INSERT INTO payload_migrations (name, batch) VALUES ('20261010_120440_initial', 1)")
    for (const statement of statements(accounts)) {
      db.exec(statement)
      if (statement.startsWith('ALTER TABLE `inquiries`')) break
    }
    db.exec("INSERT INTO customers (id, name, consented_at, email, salt, hash) VALUES (8, 'Existing customer', '2026-10-10', 'customer@example.test', 'customer-salt', 'customer-hash')")
    db.exec("INSERT INTO saved_vehicles (id, customer_id, key, kind, title) VALUES (9, 8, 'existing-car', 'auction', 'Saved car')")
    db.exec("INSERT INTO inquiries (id, customer_id, name, email, phone, message, consent) VALUES (10, 8, 'Customer', 'customer@example.test', '123', 'Keep inquiry', 1)")
    db.close()
    run()
    run()
    db = new DatabaseSync(filename)
    journal(db)
    existingUserPreserved(db)
    assert.equal(db.prepare('SELECT hash FROM customers WHERE id = 8').get()?.hash, 'customer-hash')
    assert.equal(db.prepare('SELECT title FROM saved_vehicles WHERE id = 9').get()?.title, 'Saved car')
    assert.equal(db.prepare('SELECT message FROM inquiries WHERE id = 10').get()?.message, 'Keep inquiry')
    db.close()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('both auth collections enforce eight characters for create, update and reset', { timeout: 120_000 }, () => {
 const { dir, run } = sandbox()
 try { run('tests/fixtures/password-policy.ts') } finally { rmSync(dir, { recursive: true, force: true }) }
})
