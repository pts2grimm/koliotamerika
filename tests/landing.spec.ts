import { test, expect } from '@playwright/test'
const routes = ['/vnos-na-koli-ot-usa', '/uslugi', '/kak-rabotim', '/homologacia', '/vnos-na-motori-ot-sasht', '/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena', '/amerikanski-sajt-za-koli', '/chesto-zadavani-vuprosi', '/proverka-na-istoriya-na-avtomobil', '/kalkulator', '/kontakti', '/blog']
for (const theme of ['light', 'dark'] as const) for (const width of [390, 1440]) {
 test(theme + ' interior pages at ' + width, async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.emulateMedia({ colorScheme: theme })
  await page.setViewportSize({ width, height: 1000 })
  for (const path of routes) {
   const response = await page.goto(path)
   expect(response?.status(), path).toBe(200)
   await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
   await expect(page.locator('h1')).toHaveCount(1)
   await expect(page.locator('.landing-page')).toBeVisible()
   const overflow = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'absolute'
   }).map(el => el.tagName + '.' + el.className).slice(0, 12))
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path + ': ' + overflow.join(', ')).toBe(true)
   const heroImage = page.locator('.landing-hero-image > img,.landing-contact-photo img,.journal-featured-image img').first()
   await expect(heroImage).toBeVisible()
   await expect.poll(() => heroImage.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
   if (['/vnos-na-koli-ot-usa', '/uslugi', '/kontakti', '/kalkulator', '/blog'].includes(path)) {
    await page.screenshot({ path: info.outputPath(path.slice(1) + '.png'), fullPage: false })
    if (width === 1440 && theme === 'light' || width === 390 && theme === 'dark' && path === '/kontakti') console.log('LANDING_PREVIEW:' + theme + ':' + width + ':' + path.slice(1) + ':' + (await page.screenshot({ type: 'jpeg', quality: 50 })).toString('base64'))
   }
  }
  expect(errors).toEqual([])
 })
}

test('section links, question disclosures and calculator actions work', async ({ page }) => {
 await page.goto('/vnos-na-koli-ot-usa')
 const index = page.getByRole('navigation', { name: 'На тази страница', exact: true })
 const links = index.locator('a')
 expect(await links.count()).toBeGreaterThan(2)
 for (const href of await links.evaluateAll(elements => elements.map(el => el.getAttribute('href')!))) await expect(page.locator(href)).toHaveCount(1)
 await links.nth(1).click()
 await expect(page).toHaveURL(/#topic-/)
 const question = page.locator('.landing-question').first()
 if (await question.count()) {
  await question.locator('summary').click()
  await expect(question).toHaveAttribute('open', '')
  await expect(question.locator('.landing-rich')).toBeVisible()
 }
 await page.goto('/uslugi')
 await expect(page.locator('.landing-service-card')).toHaveCount(4)
 await page.locator('.landing-service-card').filter({ hasText: 'Хомологация' }).click()
 await expect(page).toHaveURL(/homologacia/)
 await page.goto('/kalkulator')
 await page.getByRole('link', { name: 'Изчисли своя бюджет' }).click()
 await expect(page).toHaveURL(/#calc/)
 const total = await page.locator('.calculator-result > strong').innerText()
 await page.locator('.calculator-inputs input').first().fill('9000')
 await expect(page.locator('.calculator-result > strong')).not.toHaveText(total)
})

test('contact prefill and submitting an inquiry still work', async ({ page }) => {
 await page.goto('/kontakti?car=BMW%20X5')
 await expect(page.locator('[name=car]')).toHaveValue('BMW X5')
 await page.getByLabel('Име', { exact: false }).first().fill('Дизайн Тест')
 await page.getByLabel('Имейл', { exact: true }).fill('landing@example.test')
 await page.getByLabel('Телефон', { exact: false }).fill('+359888123456')
 await page.getByLabel('Какво търсиш?').fill('Търся BMW X5 с индивидуална оферта за внос.')
 await page.locator('[name=consent]').check()
 await page.getByRole('button', { name: 'Изпрати запитване' }).click()
 await expect(page.getByRole('button', { name: 'Ново запитване' })).toBeVisible()
})

test('narrow phones fit and home, legal pages and articles keep their templates', async ({ page }) => {
 await page.setViewportSize({ width: 320, height: 900 })
 for (const path of ['/uslugi', '/homologacia', '/kalkulator', '/kontakti', '/blog']) {
  await page.goto(path)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true)
 }
 for (const path of ['/', '/zashtita-na-lichni-danni', '/koli-ot-manheim']) {
  await page.goto(path)
  await expect(page.locator('.landing-page')).toHaveCount(0)
  await expect(page.locator('h1')).toHaveCount(1)
 }
 await page.goto('/')
 await expect(page.locator('.hero-showcase')).toBeVisible()
})
