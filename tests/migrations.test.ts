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
    assert.doesNotMatch(result.stdout + result.stderr, /(?:Page SEO upgrade|Content review|Pricing details|Plain language update|Customer pricing update|Services review|Gallery review|Clarity update|Calculator delivery update) deferred/, result.stdout + result.stderr)
  }
  return { dir, filename, run }
}
function journal(db: DatabaseSync) {
  assert.deepEqual(db.prepare('SELECT name FROM payload_migrations ORDER BY name').all().map(row => row.name), [
    '20261010_120440_initial', '20261010_135337_customer_accounts', '20261012_010000_contact_details', '20261012_020000_integrations', '20261012_030000_calculator_eur', '20261017_120000_consent_events', '20261017_180000_bills_of_sale', '20261018_120000_catalog_events', '20261018_160000_catalog_totals',
  ])
  for (const name of ['pages', 'site_settings', 'customers', 'saved_vehicles', 'inquiries', 'integrations', 'consent_events', 'bills_of_sale', 'catalog_events', 'catalog_totals']) {
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
    assert.ok(String(db.prepare("SELECT body FROM pages WHERE slug = 'koli-ot-amerika-galeriya'").get()?.body).includes('Намери подобен автомобил'))
    assert.ok(String(db.prepare("SELECT us_address FROM site_settings").get()?.us_address).includes('Pontus LLC'))
    assert.ok(String(db.prepare("SELECT body FROM pages WHERE slug = 'obshti-usloviya'").get()?.body).includes('3–4 месеца'))
    assert.ok(String(db.prepare("SELECT body FROM pages WHERE slug = 'obshti-usloviya'").get()?.body).includes('една и съща сума'))
    assert.ok(String(db.prepare("SELECT body FROM pages WHERE slug = 'vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena'").get()?.body).includes('същата клиентска тарифа'))
    const hash = db.prepare('SELECT hash FROM users').get()?.hash
    db.exec("UPDATE pages SET title = 'Editorial title' WHERE slug = 'kak-rabotim'")
    assert.equal(db.prepare("SELECT status FROM pages WHERE slug = 'clean-title-kola-ot-amerika'").get()?.status, 'draft')
    db.exec("UPDATE pages SET title = 'Edited blog draft', status = 'published', published_at = '2099-01-01T10:00:00.000Z' WHERE slug = 'clean-title-kola-ot-amerika'")
    db.exec("UPDATE site_settings SET phone = '', email = 'edited@example.test', us_address = 'Edited US address', google_maps_u_r_l = ''")
    db.close()
    run()
    run('tests/fixtures/initialize-database.ts')
    db = new DatabaseSync(filename)
    journal(db)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pages').get()?.n, count)
    assert.equal(db.prepare('SELECT hash FROM users').get()?.hash, hash)
    assert.equal(db.prepare("SELECT title FROM pages WHERE slug = 'kak-rabotim'").get()?.title, 'Editorial title')
    assert.deepEqual({ ...db.prepare("SELECT title, status, published_at FROM pages WHERE slug = 'clean-title-kola-ot-amerika'").get() }, {
      title: 'Edited blog draft', status: 'published', published_at: '2099-01-01T10:00:00.000Z',
    })
    assert.deepEqual({ ...db.prepare('SELECT phone, email, us_address, google_maps_u_r_l FROM site_settings').get() }, { phone: '', email: 'edited@example.test', us_address: 'Edited US address', google_maps_u_r_l: '' })
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

test('SEO upgrade journals once, preserves edited fields and never republishes pages', { timeout: 300_000 }, () => {
 const { dir, filename, run } = sandbox()
 try {
  run()
  let db = new DatabaseSync(filename)
  assert.ok(Number(db.prepare("SELECT COUNT(*) AS n FROM payload_kv WHERE key LIKE 'content:page-seo:2026-10:v1:%'").get()?.n) >= 11)
  assert.equal(db.prepare("SELECT title FROM pages WHERE slug = 'uslugi'").get()?.title, 'Услуги за внос на автомобили от Америка')
  // Emulate an existing database before the one-time upgrade.
  db.exec("DELETE FROM payload_kv WHERE key = 'content:page-seo:2026-10:v1:proverka-na-istoriya-na-avtomobil'")
  db.exec("UPDATE pages SET title = 'Editorial VIN title', seo_title = 'Editorial SEO', seo_description = 'Нашата компания извършава специализирана Проверка на история на автомобил​ преди закупуване от сайтове за коли от америка​', status = 'draft' WHERE slug = 'proverka-na-istoriya-na-avtomobil'")
  // Deliberately revert a field after the journal: it must not be changed again.
  db.exec("UPDATE pages SET title = 'Един автомобил. Цялостен подход.' WHERE slug = 'uslugi'")
  const before = db.prepare("SELECT body, legacy_image, source_u_r_l FROM pages WHERE slug = 'proverka-na-istoriya-na-avtomobil'").get()
  db.close()
  run()
  db = new DatabaseSync(filename)
  const row = db.prepare("SELECT title, seo_title, seo_description, status FROM pages WHERE slug = 'proverka-na-istoriya-na-avtomobil'").get()
  assert.equal(row?.title, 'Editorial VIN title')
  assert.equal(row?.seo_title, 'Editorial SEO')
  assert.equal(row?.status, 'draft')
  assert.match(String(row?.seo_description), /^Проверка на историята/)
  assert.deepEqual(db.prepare("SELECT body, legacy_image, source_u_r_l FROM pages WHERE slug = 'proverka-na-istoriya-na-avtomobil'").get(), before)
  assert.equal(db.prepare("SELECT title FROM pages WHERE slug = 'uslugi'").get()?.title, 'Един автомобил. Цялостен подход.')
  db.close()
  run('tests/fixtures/page-seo-rollback.ts')
 } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('content review is atomic, idempotent and preserves edited CMS content', { timeout: 300_000 }, () => {
 const { dir, run } = sandbox()
 try { run(); run('tests/fixtures/content-review.ts') } finally { rmSync(dir, { recursive:true, force:true }) }
})

test('pricing detail upgrade preserves manual edits and commits tables with its audit atomically', { timeout:300_000 },()=>{
 const {dir,run}=sandbox()
 try{run();run('tests/fixtures/pricing-details.ts')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('plain-language revision preserves custom content, metadata and transaction rollback', { timeout:300_000 },()=>{
 const {dir,run}=sandbox()
 try{run();run('tests/fixtures/plain-language.ts')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('customer pricing update is atomic, preserves manual edits and runs once', { timeout:300_000 },()=>{
 const {dir,run}=sandbox()
 try{run();run('tests/fixtures/customer-pricing.ts')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('service review preserves custom fields and seed sections with transactional rollback', { timeout:300_000 },()=>{
 const {dir,run}=sandbox()
 try{run();run('tests/fixtures/services-review.ts')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('partial contact migration preserves an existing settings row and retries safely', {timeout:300_000},()=>{
 const {dir,filename,run}=sandbox()
 try{
  let db=new DatabaseSync(filename)
  for(const statement of statements(initial))db.exec(statement)
  for(const statement of statements(accounts))db.exec(statement)
  db.exec("INSERT INTO payload_migrations (name,batch) VALUES ('20261010_120440_initial',1),('20261010_135337_customer_accounts',1)")
  db.exec("ALTER TABLE site_settings ADD COLUMN us_address text")
  db.exec("INSERT INTO site_settings (brand,phone,email,us_address) VALUES ('My business','123','owner@example.test','My US address')")
  db.close()
  run();run()
  db=new DatabaseSync(filename);journal(db)
  assert.deepEqual({...db.prepare('SELECT brand,phone,email,us_address FROM site_settings').get()},{brand:'My business',phone:'123',email:'owner@example.test',us_address:'My US address'})
  assert.ok(String(db.prepare('SELECT google_maps_u_r_l FROM site_settings').get()?.google_maps_u_r_l).includes('ChIJXf7M8N24eyIRGQWGyPD0i9U'))
  db.close()
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('calculator migration resumes with existing new columns and preserves legacy/custom values', {timeout:300_000},()=>{
 const {dir,filename,run}=sandbox()
 try{
  let db=new DatabaseSync(filename)
  for(const statement of statements(initial))db.exec(statement)
  db.exec("INSERT INTO payload_migrations (name,batch) VALUES ('20261010_120440_initial',1)")
  db.exec("ALTER TABLE calculator_settings ADD COLUMN usd_to_eur numeric NOT NULL DEFAULT 0.9")
  db.exec("INSERT INTO calculator_settings (usd_to_bgn,fixed_costs,usd_to_eur,default_inland,default_shipping,note) VALUES (2,777,0.95,650,1234,'Keep note')")
  db.close();run();run()
  db=new DatabaseSync(filename);journal(db)
  assert.deepEqual({...db.prepare('SELECT usd_to_bgn,fixed_costs,usd_to_eur,default_inland,default_shipping,note FROM calculator_settings').get()},{usd_to_bgn:2,fixed_costs:777,usd_to_eur:0.95,default_inland:650,default_shipping:1234,note:'Keep note'})
  assert.equal(db.prepare('SELECT shipping_usd FROM calculator_settings').get()?.shipping_usd,1000)
  assert.equal(db.prepare('SELECT delivery_eur FROM calculator_settings').get()?.delivery_eur,1000)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM payload_kv WHERE key='calculator:delivery:2026-10-14:v1'").get()?.n,1)
  // The one-time default update must not undo a later explicit administrator edit.
  db.exec('UPDATE calculator_settings SET delivery_eur=900')
  db.close();run()
  db=new DatabaseSync(filename)
  assert.equal(db.prepare('SELECT delivery_eur FROM calculator_settings').get()?.delivery_eur,900)
  // A custom amount on first encounter must also survive the update.
  db.exec("DELETE FROM payload_kv WHERE key='calculator:delivery:2026-10-14:v1'")
  db.exec('UPDATE calculator_settings SET delivery_eur=875')
  db.close();run()
  db=new DatabaseSync(filename)
  assert.equal(db.prepare('SELECT delivery_eur FROM calculator_settings').get()?.delivery_eur,875)
  db.close()
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('confirmed terms update rolls back with its journal and respects later edits', {timeout:300_000},()=>{
 const {dir,run}=sandbox()
 try{run();run('tests/fixtures/clarity.ts')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('consent retention expires old records and customer deletion removes identity links', { timeout: 120000 }, () => {
 const {dir,run}=sandbox()
 try { run(); run('tests/fixtures/consent-retention.ts') } finally { rmSync(dir,{recursive:true,force:true}) }
})

test('catalog retention and additive migration preserve data and remove deleted customer links', {timeout:120000},()=>{
 const {dir,run}=sandbox()
 try {run();run('tests/fixtures/catalog-retention.ts')} finally {rmSync(dir,{recursive:true,force:true})}
})

test('daily catalogue counters have no identity columns and increment atomically within bounds', {timeout:120000},()=>{
 const {dir,run}=sandbox()
 try {run();run('tests/fixtures/catalog-totals.ts')} finally {rmSync(dir,{recursive:true,force:true})}
})
