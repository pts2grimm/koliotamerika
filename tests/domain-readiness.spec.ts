import { test, expect } from '@playwright/test'

test('domain indexing follows the actual host without disabling public production pages', async ({ request }) => {
 const home = await request.get('/')
 expect(home.status()).toBe(200)
 expect(home.headers()['x-robots-tag']).toBeUndefined()
 const robots = await request.get('/robots.txt')
 expect(await robots.text()).toContain('Allow: /')
 expect(await robots.text()).toContain('Sitemap: http://localhost:3100/sitemap.xml')
 const sitemap = await request.get('/sitemap.xml')
 expect(await sitemap.text()).toContain('<loc>http://localhost:3100/')
 for (const host of ['preview.hostingersite.com', 'unconfigured.example.test']) {
  const headers = { host }
  const preview = await request.get('/', { headers })
  expect(preview.status()).toBe(200)
  expect(preview.headers()['x-robots-tag']).toContain('noindex')
  const blocked = await request.get('/robots.txt', { headers })
  expect(await blocked.text()).toContain('Disallow: /')
  expect(await blocked.text()).not.toContain('Allow: /')
  expect(await blocked.text()).not.toContain('Sitemap:')
  const empty = await request.get('/sitemap.xml', { headers })
  expect(await empty.text()).not.toContain('<loc>')
 }
 // A preceding preview request must not poison the production response or cache.
 expect((await request.get('/')).headers()['x-robots-tag']).toBeUndefined()
 expect(await (await request.get('/sitemap.xml')).text()).toContain('<loc>')
})

test('legacy price URL found in Search Console redirects to the preserved price page', async ({ request }) => {
 const response = await request.get('/vnos-na-koli-usa/vnos-na-koli-ot-amerika-cena', { maxRedirects: 0 })
 expect(response.status()).toBe(308)
 expect(response.headers().location).toBe('/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena')
 expect((await request.get('/vnos-na-koli-usa/vnos-na-koli-ot-amerika-cena/')).status()).toBe(200)
})

test('canonical www redirect preserves paths and query values without following production URLs', async ({ request }) => {
 const paths = [
  '/',
  '/morski-transport-na-avtomobili-ot-sasht?utm_source=google&brand=BMW&brand=Audi',
  '/api/media/file/Remove%20background%20project%20%282%29.png?download=1',
  '/blog/%D0%B2%D0%BD%D0%BE%D1%81?q=%D0%BA%D0%BE%D0%BB%D0%B8&next=%2Fprofil',
  '/sitemap.xml',
 ]
 for (const path of paths) {
  const response = await request.get(path, { headers: { host: 'www.koliotamerika.bg' }, maxRedirects: 0 })
  expect(response.status(), path).toBe(308)
  const location = new URL(response.headers().location)
  const expected = new URL(path, 'https://koliotamerika.bg')
  expect(location.origin).toBe(expected.origin)
  expect(decodeURIComponent(location.pathname)).toBe(decodeURIComponent(expected.pathname))
  expect([...location.searchParams]).toEqual([...expected.searchParams])
  expect(response.headers()['x-robots-tag']).toBeUndefined()
 }
})

test('canonical www redirect leaves apex and preview hosts intact and preserves old sitemap redirects', async ({ request }) => {
 for (const host of ['koliotamerika.bg', 'preview.hostingersite.com', 'wwwXkoliotamerikaXbg']) {
  const response = await request.get('/', { headers: { host }, maxRedirects: 0 })
  expect(response.status(), host).toBe(200)
  expect(response.headers().location).toBeUndefined()
 }
 const legacy = await request.get('/sitemap_index.xml', { maxRedirects: 0 })
 expect(legacy.status()).toBe(308)
 expect(legacy.headers().location).toBe('/sitemap.xml')
})
