import { test, expect } from '@playwright/test'

for (const theme of ['light', 'dark']) {
 test(`search controls remain legible and usable across widths in ${theme} theme`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('koa-theme', value), theme)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  const form = page.getByRole('form', { name: 'Намери автомобил', exact: true })
  for (const width of [320, 390, 768, 1024, 1440]) {
   await page.setViewportSize({ width, height: 900 })
   await form.scrollIntoViewIfNeeded()
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
   for (const field of await form.locator('select').all()) {
    const metrics = await field.evaluate(el => {
     const style = getComputedStyle(el), rect = el.getBoundingClientRect()
     return { height: rect.height, width: rect.width, border: style.borderTopWidth, image: style.backgroundImage,
      arrow: style.backgroundPosition, padding: parseFloat(style.paddingRight), size: parseFloat(style.fontSize) }
    })
    expect(metrics.height).toBeGreaterThanOrEqual(52)
    expect(metrics.border).toBe('1px')
    expect(metrics.image).toContain('svg')
    expect(metrics.arrow).toContain('14px')
    expect(metrics.padding).toBeGreaterThanOrEqual(42)
    expect(metrics.size).toBeGreaterThanOrEqual(16)
    if (width <= 390) expect(metrics.width).toBeGreaterThan(220)
   }
   if (width === 390) {
    await form.screenshot({ path: `test-results/search-${theme}-mobile.png` })
    console.log('FILTER_PREVIEW:home-' + theme + ':' + (await form.screenshot({ type: 'jpeg', quality: 65 })).toString('base64'))
   }
  }
  const make = form.getByRole('combobox', { name: 'Марка', exact: true })
  await make.focus()
  expect(await make.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid')
  await make.selectOption('BMW')
  await expect(form.getByRole('combobox', { name: 'Модел', exact: true })).toBeEnabled()
 })

 test(`expanded filters are reachable on desktop and mobile in ${theme} theme`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('koa-theme', value), theme)
  await page.setViewportSize({ width: 1280, height: 700 })
  await page.goto('/targove')
  const form = page.getByRole('form', { name: 'Филтри за автомобили' })
  const summary = form.locator('summary')
  const title = await summary.locator('strong').boundingBox()
  const hint = await summary.locator('small').boundingBox()
  expect(title).not.toBeNull()
  expect(hint).not.toBeNull()
  expect(hint!.y).toBeGreaterThanOrEqual(title!.y + title!.height)
  await summary.click()
  await form.getByRole('combobox', { name: 'Гориво', exact: true }).selectOption('Electric')
  await form.getByRole('combobox', { name: 'Продавач', exact: true }).selectOption('insurance')
  const submit = form.getByRole('button', { name: 'Намери автомобил', exact: true })
  await submit.scrollIntoViewIfNeeded()
  await expect(submit).toBeInViewport()
  expect(await page.locator('.catalogue-sidebar').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
  await form.screenshot({ path: `test-results/filters-${theme}-desktop.png` })
  console.log('FILTER_PREVIEW:sidebar-' + theme + ':' + (await form.screenshot({ type: 'jpeg', quality: 65 })).toString('base64'))
  await page.setViewportSize({ width: 320, height: 640 })
  await page.getByRole('button', { name: /^Филтри/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Филтри за търговете' })
  await expect(dialog).toBeVisible()
  await dialog.locator('summary').click()
  await dialog.getByRole('combobox', { name: 'Продавач', exact: true }).selectOption('insurance')
  await submit.scrollIntoViewIfNeeded()
  await expect(submit).toBeInViewport()
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/filters-${theme}-mobile.png` })
  await submit.click()
  await expect(page).toHaveURL(/seller_type=insurance/)
 })
}
