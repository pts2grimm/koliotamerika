import schedule from '../content/editorial-schedule.json' with { type: 'json' }
import { test, expect } from '@playwright/test'
import redirects from '../content/legacy-redirects.json' with { type: 'json' }
import snapshot from '../content/wordpress.json' with { type: 'json' }
test('blog SEO, migration URLs, draft protection and timed release', async ({ page, playwright }) => {
 const baseURL = 'http://localhost:3100'
 const visitor = await playwright.request.newContext({ baseURL, userAgent: 'Twitterbot/1.0' })
 const admin = await playwright.request.newContext({ baseURL })
 try {
  await page.goto('/blog?page=2')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', baseURL + '/blog?page=2')
  await expect(page.getByRole('link', { name: 'Предишна', exact: true })).toHaveAttribute('href', '/blog')
  for (const route of ['/blog?page=0', '/blog?page=1.5', '/blog?page=99999', '/blog?page=1&page=2']) {
   const response = await visitor.get(route)
   expect(response.status(), route).toBe(404)
  }
  for (const [from, to] of Object.entries(redirects)) {
   const response = await visitor.get(from, { maxRedirects: 0 })
   expect(response.status(), from).toBe(308)
   expect(new URL(response.headers().location, baseURL).pathname).toBe(to)
  }
  const oldPagination = await visitor.get('/blog/page/2', { maxRedirects: 0 })
  expect(oldPagination.status()).toBe(308)
  expect(oldPagination.headers().location).toBe('/blog?page=2')
  await page.goto('/koli-ot-manheim')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/images\/legacy\//)
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
  const graph = schemas.map(s => JSON.parse(s)).find(s => s['@graph'])['@graph']
  expect(graph[0]['@type']).toBe('BlogPosting')
  expect(graph[0].datePublished).toContain('2025-10-07')
  // This seeded article receives the content-review update after the archive import.
  // Its original publication date stays intact; the review has a separate visible date.
  const articleTimes = page.locator('.article-meta time')
  await expect(articleTimes).toHaveCount(2)
  expect(graph[0].datePublished).toBe(await articleTimes.first().getAttribute('datetime'))
  const reviewedAt = await articleTimes.last().getAttribute('datetime')
  expect(reviewedAt).toBeTruthy()
  expect(graph[0].dateModified).toBe(reviewedAt)
  expect(new Date(reviewedAt!).getTime()).toBeGreaterThan(new Date(graph[0].datePublished).getTime())
  await expect(page.locator('.article-body h2').first()).toHaveText('Какво сравняваш при избор на платформа')
  for (const width of [320, 390, 1440]) {
   await page.setViewportSize({ width, height: 900 })
   for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' })
    await page.reload()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
   }
  }
  // Capture the built article in both themes, including mobile text wrapping.
  for (const width of [390, 1440]) {
   await page.setViewportSize({ width, height: 1000 })
   for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await page.reload()
    await page.evaluate(() => document.fonts.ready)
    const consent = page.getByRole('button', { name: 'Само необходимите', exact: true })
    if (await consent.isVisible()) await consent.click()
    await expect(page.locator('.blog-article .article-body')).toBeVisible()
    const paragraph = page.locator('.blog-article .article-body p').first()
    expect(await paragraph.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(17)
    await expect(page.locator('.blog-article-card')).toHaveCount(3)
    // The heading, cover and body share a left edge; the cover stays secondary.
    const boxes = await Promise.all(['.blog-article-heading', '.blog-article-cover', '.blog-article .article-body'].map(selector => page.locator(selector).boundingBox()))
    expect(Math.max(...boxes.map(box => box!.x)) - Math.min(...boxes.map(box => box!.x))).toBeLessThanOrEqual(1)
    const cover = await page.locator('.blog-article-cover img').boundingBox()
    expect(cover!.height).toBeLessThanOrEqual(301)
    await page.screenshot({ path: test.info().outputPath('article-' + width + '-' + theme + '.png'), fullPage: true })
    if (process.env.BLOG_DESIGN_REVIEW === 'true' && theme === 'dark') {
     await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
     const encoded = (await page.screenshot({ type: 'jpeg', quality: 40 })).toString('base64')
     for (let i = 0; i < encoded.length; i += 8000) console.log('ARTICLE_PREVIEW_' + width + ':' + encoded.slice(i, i + 8000))
     await page.locator('.article-body').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: 'instant' }))
     const body = (await page.screenshot({ type: 'jpeg', quality: 40 })).toString('base64')
     for (let i = 0; i < body.length; i += 8000) console.log('ARTICLE_BODY_' + width + ':' + body.slice(i, i + 8000))
    }
   }
  }
  for (const article of snapshot.items.filter(item => item.kind === 'article')) {
   const response = await visitor.get('/' + article.slug)
   expect(response.status(), article.slug).toBe(200)
  }
  const slug = 'clean-title-kola-ot-amerika'
  expect((await visitor.get('/' + slug)).status()).toBe(404)
  const signup = await admin.post('/api/users/first-register', { data: { email: 'seo@example.test', password: 'Seo-test-password-2026', name: 'SEO Test' } })
  expect(signup.ok(), await signup.text()).toBe(true)
  const login = await admin.post('/api/users/login', { data: { email: 'seo@example.test', password: 'Seo-test-password-2026' } })
  expect(login.ok()).toBe(true)
  const headers = { Authorization: 'JWT ' + (await login.json()).token }
  const found = await admin.get('/api/pages', { headers, params: { 'where[slug][equals]': slug } })
  const draft = (await found.json()).docs[0]
  expect(draft, 'Imported draft must be readable with staff authentication').toBeTruthy()
  if (process.env.ERIDAN_RELEASE_TEST === 'true') {
   for (const item of schedule) {
    const response = await admin.get('/api/pages', { headers, params: { 'where[slug][equals]': item.slug } })
    const scheduled = (await response.json()).docs[0]
    const futureSlot = Date.parse(item.publishedAt) > Date.now()
    expect(scheduled.status).toBe(futureSlot ? 'published' : 'draft')
    if (futureSlot) expect(scheduled.publishedAt).toBe(item.publishedAt)
    expect((await visitor.get('/' + item.slug)).status()).toBe(404)
    expect(await (await visitor.get('/sitemap.xml')).text()).not.toContain('/' + item.slug)
   }
  } else expect(draft.status).toBe('draft')
  expect(draft.body.root.children.length).toBeGreaterThan(10)
  const future = await admin.patch('/api/pages/' + draft.id, { headers, data: { status: 'published', publishedAt: '2099-01-01T10:00:00.000Z' } })
  expect(future.ok(), await future.text()).toBe(true)
  expect((await visitor.get('/' + slug)).status()).toBe(404)
  expect((await (await visitor.get('/api/pages', { params: { 'where[slug][equals]': slug } })).json()).docs).toHaveLength(0)
  expect(await (await visitor.get('/blog')).text()).not.toContain('href="/' + slug + '"')
  expect(await (await visitor.get('/sitemap.xml')).text()).not.toContain('/' + slug)
  const release = await admin.patch('/api/pages/' + draft.id, { headers, data: { publishedAt: '2026-01-01T10:00:00.000Z' } })
  expect(release.ok()).toBe(true)
  expect((await visitor.get('/' + slug)).status()).toBe(200)
  expect((await (await visitor.get('/api/pages', { params: { 'where[slug][equals]': slug } })).json()).docs).toHaveLength(1)
  expect(await (await visitor.get('/blog')).text()).toContain('href="/' + slug + '"')
  expect(await (await visitor.get('/sitemap.xml')).text()).toContain('/' + slug)
  await page.goto('/' + slug)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('.article-body h2').first()).toHaveText('Какво означава Clean Title?')
  const hero = page.locator('.editorial-image img')
  await expect(hero).toHaveAttribute('alt', /Илюстрация на автомобил/)
  await expect(hero).toHaveAttribute('src', /clean-title/)
  await expect.poll(() => hero.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('.editorial-caption')).toContainText('AI')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /images\/editorial\/clean-title\.png/)
  const artworkGraph = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s)).find(s => s['@graph'])['@graph']
  expect(artworkGraph[0].image).toEqual([baseURL + '/images/editorial/clean-title.png'])
  await page.goto('/blog')
  const featuredImage = page.locator('.journal-featured a[href="/' + slug + '"] img')
  await expect(featuredImage).toHaveAttribute('src', /clean-title/)
  await expect.poll(() => featuredImage.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
 } finally { await visitor.dispose(); await admin.dispose() }
})
