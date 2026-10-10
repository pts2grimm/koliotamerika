import { test, expect } from '@playwright/test'

test('theme follows the system, persists an explicit choice and works from the keyboard', async ({ page }) => {
 const errors: string[] = []
 page.on('pageerror', e => errors.push(e.message))
 await page.emulateMedia({ colorScheme: 'dark' })
 await page.goto('/')
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
 const toggle = page.getByRole('button', { name: 'Тъмна тема', exact: true })
 await expect(toggle).toHaveAttribute('aria-pressed', 'true')
 await toggle.focus()
 await page.keyboard.press('Enter')
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
 await toggle.click()
 await page.goto('/kontakti')
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
 await page.emulateMedia({ colorScheme: 'light' })
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
 expect(errors).toEqual([])
})

test('system changes and unavailable storage are supported', async ({ page }) => {
 await page.emulateMedia({ colorScheme: 'light' })
 await page.addInitScript(() => {
  Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Storage blocked') } })
  Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('Storage blocked') } })
 })
 await page.goto('/')
 await expect(page.getByRole('button', { name: 'Тъмна тема', exact: true })).toHaveAttribute('aria-pressed', 'false')
 await page.emulateMedia({ colorScheme: 'dark' })
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
 await page.getByRole('button', { name: 'Тъмна тема', exact: true }).click()
 await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

for (const width of [320, 390, 768, 1024, 1440]) {
 test('dark pages fit viewport ' + width, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  for (const path of ['/', '/targove', '/targove/kola?lot=12345678&site=1', '/kontakti', '/kalkulator', '/registracia', '/profil', '/blog']) {
   await page.goto(path)
   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
   await expect(page.getByRole('button', { name: 'Тъмна тема', exact: true })).toBeVisible()
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true)
   expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(13, 22, 28)')
   if (path === '/registracia') {
    await expect(page.locator('input[name=password]')).toHaveAttribute('minlength', '8')
    expect(await page.locator('input[name=password]').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(13, 22, 28)')
   }
   if ((width === 390 || width === 1440) && ['/', '/targove', '/kontakti'].includes(path)) await page.screenshot({ path: info.outputPath(path === '/' ? 'home.png' : path.slice(1) + '.png'), fullPage: true })
  }
 })
}
