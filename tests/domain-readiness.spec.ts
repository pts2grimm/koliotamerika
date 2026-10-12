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
