import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { chromium } from '@playwright/test'
// Production-only regression: Next's automatic link prefetch does not run in dev.
// All upstream requests go to the isolated local fixture, never to ApiCar.
const dist = process.env.NEXT_DIST_DIR || '.next-preview'
assert.ok(/^\.next-[a-z-]+$/.test(dist))
await rm(`${dist}/cache/fetch-cache`, { recursive: true, force: true })
const fixture = spawn(process.execPath, ['tests/fixtures/auction-server.mjs'], { stdio: 'pipe' })
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3400'], {
 env: { ...process.env, NEXT_DIST_DIR: dist, PREVIEW_MODE: 'true', AUCTION_PROVIDER: 'legacy', AUCTION_API_BASE_URL: 'http://127.0.0.1:3199', NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3400', PAYLOAD_SECRET: randomBytes(48).toString('hex') }, stdio: 'pipe',
})
const exits = [once(fixture, 'exit'), once(app, 'exit')]
let diagnostics = ''; for (const child of [fixture, app]) child.stderr.on('data', chunk => { diagnostics += chunk })
let browser
const counts = async () => { const { requests } = await (await fetch('http://127.0.0.1:3199/test-requests')).json(); return { searches: requests.filter(r => r.path === '/search').length, details: requests.filter(r => r.path === '/car').length, makes: requests.filter(r => r.path === '/makes-models').length } }
try {
 for (let i = 0; i < 120; i++) { if (app.exitCode !== null || fixture.exitCode !== null) throw new Error(diagnostics); try { if ((await fetch('http://127.0.0.1:3400/registracia')).ok) break } catch {} await new Promise(r => setTimeout(r, 250)) }
 browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
 await page.route('https://cs.copart.com/**', route => route.fulfill({ path: 'public/images/hero.png', contentType: 'image/png' }))
 await page.goto('http://127.0.0.1:3400/targove?make=BMW&model=X5', { waitUntil: 'networkidle' })
 for (const card of await page.locator('.auction-card').all()) { await card.scrollIntoViewIfNeeded(); await card.locator('.card-photo-link').hover(); await page.waitForTimeout(120) }
 const next = page.getByRole('navigation', { name: 'Страници с търгове' }).getByRole('link', { name: 'Следваща' })
 await next.hover(); await page.waitForTimeout(1500)
 const before = await counts(); console.log('Page 1, scroll and hover:', before)
 await next.click(); await page.waitForURL(/pagenum=2/); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000)
 const second = await counts(); console.log('After page 2:', second)
 await page.locator('.auction-card .card-photo-link').first().click(); await page.waitForURL(/targove\/kola/); await page.getByRole('region', { name: 'Свързани автомобили' }).waitFor(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000)
 const detail = await counts(); console.log('After opening one car:', detail)
 await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500)
 const repeat = await counts(); console.log('After reloading the same car:', repeat)
 if (!process.argv.includes('--baseline')) {
  assert.deepEqual(before, { searches: 2, details: 0, makes: 1 })
  assert.deepEqual(second, { searches: 4, details: 0, makes: 1 })
  assert.deepEqual(detail, { searches: 4, details: 1, makes: 1 }) // Related BMW/X5 result reuses page 1.
  assert.deepEqual(repeat, detail)
  console.log('PASS: no speculative lot or pagination calls; one detail call shared by metadata/content; repeat navigation uses cache.')
 }
} finally {
 await browser?.close(); fixture.kill('SIGTERM'); app.kill('SIGTERM'); await Promise.all(exits)
 for (const suffix of ['', '-wal', '-shm']) await rm(`/tmp/koa-preview-${app.pid}.db${suffix}`, { force: true })
}
