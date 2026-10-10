import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { chromium } from '@playwright/test'
import { createClient } from '@libsql/client'

// Run after: PREVIEW_MODE=true NEXT_DIST_DIR=.next-preview npm run build
const root = await mkdtemp(path.join(tmpdir(), 'koa-preview-test-'))
const port = 3300
const base = `http://127.0.0.1:${port}`
const sentinel = path.join(root, 'production-must-not-be-created.db')
let browser
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  for (let run = 1; run <= 2; run++) {
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'], {
      env: { ...process.env, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-preview', PREVIEW_MODE: 'true', PAYLOAD_SECRET: randomBytes(48).toString('hex'), DATABASE_URI: `file:${sentinel}`, MEDIA_DIR: path.join(root, 'media'), NEXT_PUBLIC_SERVER_URL: base, SITE_INDEXABLE: 'true' },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let diagnostics = ''
    child.stderr.on('data', data => { diagnostics += data })
    const exited = once(child, 'exit')
    const previewDB = path.join(tmpdir(), `koa-preview-${child.pid}.db`)
    try {
      let ready = false
      for (let attempt = 0; attempt < 120; attempt++) {
        if (child.exitCode !== null) throw new Error(`Preview process exited: ${diagnostics}`)
        try { const response = await fetch(`${base}/kontakti`); if (response.ok) { ready = true; break } } catch {}
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      assert.ok(ready, `Preview failed to start: ${diagnostics}`)
      const page = await browser.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/kontakti`, { waitUntil: 'networkidle' })
      assert.equal(await page.getByRole('button', { name: 'Изпрати запитване' }).isDisabled(), true)
      assert.ok((await page.locator('.preview-notice').textContent()).includes('Демонстрационна версия'))
      const article = await page.goto(`${base}/vnos-na-koli-ot-usa`, { waitUntil: 'networkidle' })
      assert.equal(article.status(), 200)
      assert.ok((await page.locator('article').textContent()).includes('Безплатна консултация'))
      assert.deepEqual(errors, [])
      await page.close()
      for (const route of ['/admin', '/admin/create-first-user', '/api/pages']) {
        assert.equal((await fetch(base + route)).status, 403)
      }
      for (const route of ['/api/inquiry', '/api/users/first-register', '/']) {
        const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        assert.equal(response.status, 403)
      }
      const robots = await fetch(`${base}/robots.txt`)
      assert.equal(robots.headers.get('x-robots-tag'), 'noindex, nofollow')
      assert.ok((await robots.text()).includes('Disallow: /'))
      assert.ok(!(await (await fetch(`${base}/sitemap.xml`)).text()).includes('<loc>'))
      assert.equal(existsSync(sentinel), false, 'Preview must never initialize the configured production database')
      const db = createClient({ url: `file:${previewDB}` })
      try {
        assert.equal(Number((await db.execute('SELECT count(*) AS n FROM pages')).rows[0].n), 46)
        for (const table of ['users', 'inquiries']) assert.equal(Number((await db.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n), 0)
      } finally { db.close() }
      console.log(`Preview run ${run}: fresh startup, content, disabled forms/admin/API writes and noindex passed.`)
    } finally {
      child.kill('SIGTERM')
      await exited
      for (const suffix of ['', '-wal', '-shm']) await rm(previewDB + suffix, { force: true })
    }
  }
} finally {
  await browser?.close()
  await rm(root, { recursive: true, force: true })
}
