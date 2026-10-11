import { test, expect } from '@playwright/test'

test('separate admin lists preserve documents and choose the correct creation type', async ({ page, playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL })
  const credentials = { email: 'content-admin@example.test', password: 'Content-admin-2026' }
  const setup = await api.post('/api/users/first-register', { data: { ...credentials, name: 'Editor' } })
  expect(setup.ok()).toBeTruthy()
  const login = await api.post('/api/users/login', { data: credentials })
  expect(login.ok()).toBeTruthy()
  const { token } = await login.json()
  const headers = { Authorization: 'JWT ' + token }
  async function find(slug: string) {
    const response = await api.get('/api/pages', { headers, params: { 'where[slug][equals]': slug } })
    expect(response.ok()).toBeTruthy()
    return (await response.json()).docs[0]
  }
  async function create(title: string, slug: string, kind: 'page' | 'article', extra = {}) {
    const response = await api.post('/api/pages', {
      headers, data: { title, slug, kind, intro: 'Integration fixture', status: 'draft', ...extra },
    })
    expect(response.ok(), await response.text()).toBeTruthy()
    return (await response.json()).doc
  }
  const oldPage = await create('QA Existing page', 'qa-existing-page', 'page')
  const oldArticle = await create('QA Existing article', 'qa-existing-article', 'article')
  await create('QA Scheduled article', 'qa-scheduled-article', 'article', { status: 'published', publishedAt: '2099-01-01T08:00:00.000Z' })

  // Custom views must protect unpublished content even when opened directly.
  await page.goto('/admin/blog-posts')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByText('QA Existing article')).toHaveCount(0)

  await page.locator('input[name="email"]').fill(credentials.email)
  await page.locator('input[name="password"]').fill(credentials.password)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/admin\/login/)
  await page.goto('/admin/site-pages')
  await expect(page.getByRole('heading', { name: 'Страници', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Existing page', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Existing article', exact: true })).toHaveCount(0)
  await expect(page.locator('nav').getByRole('link', { name: 'Блог', exact: true })).toBeVisible()
  await expect(page.locator('nav').getByRole('link', { name: 'Страници и статии', exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Нова страница', exact: true }).click()
  await expect(page.locator('#field-kind')).toContainText('Страница')
  await page.locator('#field-title').fill('QA New page')
  await page.locator('#field-slug').fill('qa-new-page')
  await page.locator('#field-intro').fill('New page introduction')
  await page.locator('#action-save').click()
  await expect.poll(async () => (await find('qa-new-page'))?.kind).toBe('page')

  await page.goto('/admin/blog-posts?search=QA')
  await expect(page.getByRole('heading', { name: 'Блог', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Existing article', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Existing page', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Нова статия', exact: true }).click()
  await expect(page.locator('#field-kind')).toContainText('Статия')
  await page.locator('#field-title').fill('QA New article')
  await page.locator('#field-slug').fill('qa-new-article')
  await page.locator('#field-intro').fill('New article introduction')
  await page.locator('#action-save').click()
  await expect.poll(async () => (await find('qa-new-article'))?.kind).toBe('article')
  await expect(page.getByRole('link', { name: '← Към блога', exact: true })).toBeVisible()

  // A query string must never turn an existing page into an article.
  await page.goto('/admin/collections/pages/' + oldPage.id + '?kind=article')
  await expect(page.locator('#field-kind')).toContainText('Страница')
  await page.locator('#field-intro').fill('Edited page introduction')
  await page.locator('#action-save').click()
  await expect.poll(async () => (await find('qa-existing-page'))?.intro).toBe('Edited page introduction')
  expect((await find('qa-existing-page')).kind).toBe('page')
  expect((await find('qa-existing-page')).id).toBe(oldPage.id)
  await page.goto('/admin/collections/pages/' + oldArticle.id)
  await expect(page.locator('#field-kind')).toContainText('Статия')
  await expect(page.getByRole('link', { name: '← Към блога', exact: true })).toBeVisible()

  await page.goto('/admin/blog-posts?search=QA&status=scheduled')
  await expect(page.getByRole('link', { name: 'QA Scheduled article', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Existing article', exact: true })).toHaveCount(0)
  await page.goto('/admin/blog-posts?search=QA&status=draft')
  await expect(page.getByRole('link', { name: 'QA Existing article', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA Scheduled article', exact: true })).toHaveCount(0)
  await page.goto('/admin/blog-posts')
  await page.getByRole('link', { name: 'Следваща →', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText(/Страница 2 от/)).toBeVisible()
  await page.goto('/admin/site-pages?search=QA%20Existing')
  await expect(page.getByRole('link', { name: 'QA Existing page', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QA New page', exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.screenshot({ path: 'test-results/admin-content-mobile.png', fullPage: true })
  await page.goto('/admin/collections/pages')
  await expect(page).toHaveURL(/\/admin\/site-pages/)

  const publicDraft = await api.get('/api/pages', { params: { 'where[slug][equals]': 'qa-new-article' } })
  expect((await publicDraft.json()).docs).toHaveLength(0)
  await api.dispose()
})
