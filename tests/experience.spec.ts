import { test, expect } from '@playwright/test'
import home from '../content/homepage.json' with { type: 'json' }

test.beforeEach(async ({ page }) => {
 await page.route('https://cs.copart.com/test-gallery-*.jpg', route => route.fulfill({ path: 'public/images/hero.png', contentType: 'image/png' }))
})

test('vehicle explanations work with hover, keyboard and touch without upstream calls', async ({ page, request }) => {
 await page.goto('/targove/kola?lot=70000000&site=1')
 await expect(page.getByRole('region', { name: 'Свързани автомобили' }).locator('.auction-card')).toHaveCount(3)
 const count = (await (await request.get('http://127.0.0.1:3199/test-requests')).json()).requests.length
 const documentButton = page.getByRole('button', { name: 'Пояснение: Certificate of Title (GA)' })
 await documentButton.hover()
 await expect(page.getByRole('tooltip')).toContainText('условията за регистрация')
 await page.keyboard.press('Escape')
 await expect(page.getByRole('tooltip')).toHaveCount(0)
 await documentButton.focus()
 await expect(page.getByRole('tooltip')).toBeVisible()
 await page.keyboard.press('Escape')
 await page.setViewportSize({ width: 390, height: 844 })
 await page.getByRole('button', { name: 'Пояснение: Застраховател' }).click()
 await expect(page.getByRole('tooltip')).toContainText('не изключва скрити дефекти')
 const bounds = await page.getByRole('tooltip').boundingBox()
 expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
 await page.screenshot({ path: 'test-results/vehicle-tooltip-mobile.png' })
 await page.locator('h1').click()
 await expect(page.getByRole('tooltip')).toHaveCount(0)
 expect((await (await request.get('http://127.0.0.1:3199/test-requests')).json()).requests.length).toBe(count)
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
 await page.screenshot({ path: 'test-results/vehicle-layout-mobile.png', fullPage: true })
 await page.setViewportSize({ width: 1440, height: 1000 })
 const gallery = await page.locator('.vehicle-gallery').boundingBox()
 const facts = await page.locator('.technical-facts').boundingBox()
 expect(facts!.y - (gallery!.y + gallery!.height)).toBeLessThan(32)
 const media = await page.locator('.detail-media').boundingBox()
 const summary = await page.locator('.detail-summary').boundingBox()
 expect(Math.abs(media!.y + media!.height - summary!.y - summary!.height)).toBeLessThan(200)
 await page.screenshot({ path: 'test-results/vehicle-layout-desktop.png', fullPage: true })
})

test('expanded desktop filters use the page scroll and the final controls remain reachable', async ({ page }) => {
 await page.setViewportSize({ width: 1280, height: 700 })
 await page.goto('/targove')
 await page.getByText('Още филтри', { exact: true }).click()
 expect(await page.locator('.catalogue-sidebar').evaluate(el => ({ overflow: getComputedStyle(el).overflowY, clipped: el.scrollHeight > el.clientHeight + 1 }))).toEqual({ overflow: 'visible', clipped: false })
 await page.getByRole('combobox', { name: 'Продавач', exact: true }).selectOption('insurance')
 await page.getByRole('button', { name: 'Намери автомобил', exact: true }).scrollIntoViewIfNeeded()
 await expect(page.getByRole('button', { name: 'Намери автомобил', exact: true })).toBeInViewport()
 await page.screenshot({ path: 'test-results/expanded-filters-desktop.png' })
 await page.getByRole('button', { name: 'Намери автомобил', exact: true }).click()
 await expect(page).toHaveURL(/seller_type=insurance/)
})

test('homepage and vehicle SEO are server rendered, with matching FAQ structured data', async ({ page, request }) => {
 const response = await request.get('/')
 const html = await response.text()
 for (const section of [home.intro, home.services, home.benefits, ...home.reasons, home.testimonials, home.partners, home.news]) expect(html).toContain(section.heading)
 for (const item of home.faq) expect(html).toContain(item.question)
 await page.goto('/')
 await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
 await expect(page.getByRole('link', { name: 'Моят профил', exact: true })).toContainText('Моят гараж')
 const faq = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s)).find(s => s['@type'] === 'FAQPage')
 expect(faq.mainEntity.slice(0, home.faq.length).map((q: { name: string }) => q.name)).toEqual(home.faq.map(q => q.question))
 await page.screenshot({ path: 'test-results/home-seo-desktop.png', fullPage: true })
 await page.locator('.home-guide-section').first().screenshot({ path: 'test-results/home-guide-desktop.png' })
 for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
 }
 await page.setViewportSize({ width: 390, height: 844 })
 await page.locator('.home-faq summary').first().click()
 await page.screenshot({ path: 'test-results/home-seo-mobile.png', fullPage: true })
 const detail = await (await request.get('/targove/kola?lot=70000000&site=1')).text()
 expect(detail).toContain('Крайна цена и доставка до България')
 expect(detail).toContain('Как мога да купя 2022 BMW X5 от Copart?')
 await page.goto('/targove/kola?lot=70000000&site=1')
 const graph = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(s => JSON.parse(s)).find(s => s['@graph'])['@graph']
 expect(graph.find((s: Record<string, unknown>) => s['@type'] === 'Vehicle').vehicleIdentificationNumber).toBe('TESTVIN0000000000')
 expect(graph.find((s: Record<string, unknown>) => s['@type'] === 'FAQPage').mainEntity).toHaveLength(4)
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3100/targove/kola?lot=70000000&site=1')
})

test('profile and enquiry pages stay readable and fit narrow screens', async ({ page }) => {
 for (const path of ['/profil', '/vhod', '/kontakti', '/kalkulator']) {
  await page.goto(path)
  for (const width of [390, 1440]) {
   await page.setViewportSize({ width, height: 900 })
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  if (path === '/vhod') {
   expect(await page.getByLabel('Имейл', { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
   await page.screenshot({ path: 'test-results/account-refresh-desktop.png' })
  }
 }
})
