import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import inventory from '../content/legacy-archives.json' with { type: 'json' }
import media from '../content/legacy-media.json' with { type: 'json' }

test('legacy archives, original media, sitemap and public access survive migration', async ({ page, playwright }) => {
 const baseURL = 'http://localhost:3100'
 const visitor = await playwright.request.newContext({ baseURL, userAgent: 'Twitterbot/1.0' })
 const admin = await playwright.request.newContext({ baseURL })
 try {
  const sitemap = await (await visitor.get('/sitemap.xml')).text()
  let checked = 0
  for (const archive of inventory.archives) {
   const found: string[] = []
   for (let number = 1; number <= Math.ceil(archive.slugs.length / 6); number++) {
    const path = archive.path + (number > 1 ? '/page/' + number : '')
    const response = await visitor.get(path)
    expect(response.status(), path).toBe(200)
    const html = await response.text()
    expect(html).toContain('rel="canonical" href="' + baseURL + path + '"')
    expect(sitemap).toContain('<loc>' + baseURL + path + '</loc>')
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
    const collection = schemas.find(item => item['@type'] === 'CollectionPage')
    expect(collection, path).toBeTruthy()
    found.push(...collection.mainEntity.itemListElement.map((item: { url: string }) => new URL(item.url).pathname.slice(1)))
    checked++
   }
   expect(found.sort(), archive.path).toEqual([...archive.slugs].sort())
  }
  expect(checked).toBe(50)
  for (const path of ['/tag/b58', '/category/uncategorized', '/tag/unknown', '/tag/bmw/page/0', '/tag/bmw/page/01', '/tag/bmw/page/999', '/tag/bmw/invalid']) {
   expect((await visitor.get(path)).status(), path).toBe(404)
   expect(sitemap).not.toContain('<loc>' + baseURL + path + '</loc>')
  }
  const first = await visitor.get('/tag/bmw/page/1', { maxRedirects: 0 })
  expect(first.status()).toBe(308)
  expect(new URL(first.headers().location, baseURL).pathname).toBe('/tag/bmw')
  for (const name of ['sitemap_index', 'wp-sitemap', 'post-sitemap', 'page-sitemap', 'category-sitemap', 'post_tag-sitemap', 'author-sitemap']) {
   const response = await visitor.get('/' + name + '.xml', { maxRedirects: 0 })
   expect(response.status(), name).toBe(308)
   expect(new URL(response.headers().location, baseURL).pathname).toBe('/sitemap.xml')
  }
  expect(media.records).toHaveLength(68)
  for (const item of media.records) {
   const response = await visitor.get(new URL(item.sourceURL).pathname)
   expect(response.status(), item.path).toBe(200)
   expect(response.headers()['content-type']).toMatch(/^image\//)
   expect(createHash('sha256').update(await response.body()).digest('hex'), item.path).toBe(item.sha256)
  }
  const archive = inventory.archives.find(item => item.slugs.length > 6)!
  for (const width of [320, 390, 1440]) {
   await page.setViewportSize({ width, height: 900 })
   await page.goto(archive.path)
   await expect(page.locator('h1')).toHaveCount(1)
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await page.getByRole('link', { name: 'Следваща', exact: true }).click()
  await expect(page).toHaveURL(baseURL + archive.path + '/page/2')
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', baseURL + archive.path + '/page/2')
  await page.screenshot({ path: 'test-results/archive-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/archive-mobile.png', fullPage: true })
  await page.goto('/bmw-b58-sreshtu-n55')
  await expect(page.getByRole('link', { name: 'bmw', exact: true })).toHaveAttribute('href', '/tag/bmw')

  const credentials = { email: 'migration@example.test', password: 'Migration-test-2026' }
  const signup = await admin.post('/api/users/first-register', { data: { ...credentials, name: 'Migration Test' } })
  expect(signup.ok(), await signup.text()).toBe(true)
  const login = await admin.post('/api/users/login', { data: credentials })
  expect(login.ok()).toBe(true)
  const headers = { Authorization: 'JWT ' + (await login.json()).token }
  const found = await admin.get('/api/pages', { headers, params: { 'where[slug][equals]': 'bmw-b58-sreshtu-n55' } })
  const doc = (await found.json()).docs[0]
  const update = async (data: Record<string, unknown>) => {
   const response = await admin.patch('/api/pages/' + doc.id, { headers, data })
   expect(response.ok(), await response.text()).toBe(true)
  }
  try {
   for (const data of [{ status: 'draft' }, { status: 'published', publishedAt: '2099-01-01T00:00:00.000Z' }]) {
    await update(data)
    expect((await visitor.get('/tag/bmw')).status()).toBe(404)
    expect(await (await visitor.get('/sitemap.xml')).text()).not.toContain('<loc>' + baseURL + '/tag/bmw</loc>')
   }
   await update({ status: 'published', publishedAt: doc.publishedAt, slug: 'bmw-migration-edited', title: 'Редактирано заглавие на BMW' })
   const html = await (await visitor.get('/tag/bmw')).text()
   expect(html).toContain('Редактирано заглавие на BMW')
   expect(html).toContain('href="/bmw-migration-edited"')
   expect(html).not.toContain('href="/bmw-b58-sreshtu-n55"')
  } finally {
   await update({ status: doc.status, publishedAt: doc.publishedAt, slug: doc.slug, title: doc.title })
  }
 } finally { await visitor.dispose(); await admin.dispose() }
})
