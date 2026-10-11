import { test, expect } from '@playwright/test'
import revisions from '../content/page-seo-2026-10.json' with { type: 'json' }

test('service pages expose editable SEO, relevant links, structured data and a mobile layout', async ({ page }) => {
 for (const revision of revisions) {
  expect((await page.goto('/' + revision.slug))?.status()).toBe(200)
  await expect(page).toHaveTitle(revision.after.seo.title)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(revision.after.title)
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', revision.after.seo.description)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'http://localhost:3100/' + revision.slug)
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  const graph = scripts.map(s => JSON.parse(s)).find(s => s['@graph'])['@graph']
  expect(graph.some((s: Record<string, unknown>) => s['@type'] === 'BreadcrumbList')).toBe(true)
  if (revision.slug === 'homologacia') expect(graph[0].mainEntity['@type']).toBe('Service')
  await expect(page.locator('.landing-next-links a')).toHaveCount(3)
 }
 for (const width of [320, 390, 1440]) {
  await page.setViewportSize({ width, height: 900 })
  for (const theme of ['light', 'dark'] as const) {
   await page.emulateMedia({ colorScheme: theme })
   for (const route of ['/uslugi','/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena','/kalkulator','/kontakti']) {
    await page.goto(route)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' ' + width).toBe(true)
   }
  }
 }
 await page.goto('/kalkulator')
 await expect(page.locator('h1')).toHaveText('Калкулатор за внос на кола от Америка')
 await expect(page.locator('a[href="/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena"]').first()).toBeVisible()
})

test('catalogue pagination, filters, empty state and robots respect indexing boundaries', async ({ page, playwright }) => {
 const baseURL = 'http://localhost:3100'
 const visitor = await playwright.request.newContext({ baseURL, userAgent: 'Twitterbot/1.0' })
 const admin = await playwright.request.newContext({ baseURL })
 const carIDs: number[] = []
 try {
  await page.goto('/avtomobili')
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow')
  expect(await (await visitor.get('/sitemap.xml')).text()).not.toContain('<loc>' + baseURL + '/avtomobili</loc>')
  for (const route of ['/avtomobili?page=0','/avtomobili?page=1.5','/avtomobili?page=99999','/avtomobili?page=1&page=2','/avtomobili?page=2']) {
   expect((await visitor.get(route)).status(), route).toBe(404)
  }
  const robots = await (await visitor.get('/robots.txt')).text()
  expect(robots).toContain('Allow: /api/media/file/')
  expect(robots).toContain('Disallow: /api/')
  expect(robots).toContain('Disallow: /admin')
  const signup = await admin.post('/api/users/first-register', { data: { email:'page-seo@example.test',password:'SEO-test-2026',name:'SEO Test' } })
  expect(signup.ok(), await signup.text()).toBe(true)
  const login = await admin.post('/api/users/login', { data: {email:'page-seo@example.test',password:'SEO-test-2026'} })
  expect(login.ok()).toBe(true)
  const headers = { Authorization: 'JWT ' + (await login.json()).token }
  for (let i=0; i<13; i++) {
   const created = await admin.post('/api/cars', {headers, data:{title:'SEO BMW '+i,slug:'seo-bmw-'+i,make:'BMW',model:'X5',year:2020,price:20000,status:'published',description:'Browser test vehicle'}})
   expect(created.ok(), await created.text()).toBe(true)
   carIDs.push((await created.json()).doc.id)
  }
  await page.goto('/avtomobili?page=2')
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',baseURL+'/avtomobili?page=2')
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','index, follow')
  await expect(page.getByRole('link',{name:'Предишна',exact:true})).toHaveAttribute('href','/avtomobili')
  expect((await visitor.get('/avtomobili?page=3')).status()).toBe(404)
  expect(await (await visitor.get('/sitemap.xml')).text()).toContain('<loc>'+baseURL+'/avtomobili</loc>')
  for (const query of ['q=BMW','sort=price','budget=21000','q=Nothing']) {
   await page.goto('/avtomobili?'+query)
   await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow')
   await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',baseURL+'/avtomobili?'+query)
  }
  // Metadata and the visible H1 must continue to follow edits made in the CMS.
  const found = await admin.get('/api/pages',{headers,params:{'where[slug][equals]':'uslugi'}})
  const services=(await found.json()).docs[0]
  const edited=await admin.patch('/api/pages/'+services.id,{headers,data:{title:'Услуги по твоя план',seo:{title:'Редактирано SEO заглавие',description:'Описание от редактора'}}})
  expect(edited.ok(),await edited.text()).toBe(true)
  await page.goto('/uslugi')
  await expect(page).toHaveTitle('Редактирано SEO заглавие')
  await expect(page.locator('h1')).toHaveText('Услуги по твоя план')
  for (const id of carIDs) expect((await admin.delete('/api/cars/'+id,{headers})).ok()).toBe(true)
 } finally { await visitor.dispose(); await admin.dispose() }
})
