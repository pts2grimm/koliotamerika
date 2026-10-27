import { test, expect } from '@playwright/test'

test('llms.txt declares UTF-8 and the browser displays Cyrillic correctly', async ({ page, request }) => {
 const response = await request.get('/llms.txt')
 expect(response.status()).toBe(200)
 expect(response.headers()['content-type']).toMatch(/text\/plain;\s*charset=utf-8/i)
 expect(await response.text()).toContain('# Коли от Америка')
 await page.goto('/llms.txt')
 expect(await page.evaluate(() => document.characterSet)).toBe('UTF-8')
 await expect(page.locator('body')).toContainText('Български сайт за внос')
})


test('llms.txt stays UTF-8 when the static host omits the charset', async ({ page, request }) => {
 const response = await request.get('/llms.txt')
 const body = await response.body()
 expect([...body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
 await page.route('**/llms.txt', route => route.fulfill({
  status: 200, headers: {'content-type': 'text/plain'}, body,
 }))
 await page.goto('/llms.txt')
 expect(await page.evaluate(() => document.characterSet)).toBe('UTF-8')
 await expect(page.locator('body')).toContainText('# Коли от Америка')
 await expect(page.locator('body')).toContainText('Български сайт за внос')
})

for (const width of [390, 1280]) {
 test('failed card image can retry or switch photos at width ' + width, async ({ page }) => {
  await page.setViewportSize({width,height:900})
  let fail = true
  let failedRequests = 0
  await page.route('https://cs.copart.com/test-gallery-*.jpg', async route => {
   if (route.request().url().endsWith('test-gallery-3.jpg') || fail && route.request().url().endsWith('test-gallery-1.jpg')) {
    failedRequests++
    return route.abort('failed')
   }
   return route.fulfill({path:'public/images/hero.png',contentType:'image/png'})
  })
  await page.goto('/targove?make=BMW&model=X5&site=1')
  const card=page.locator('.auction-card').first()
  await expect(card.getByRole('status').filter({hasText:'Снимката временно'})).toBeVisible()
  await expect(card.locator('.card-photo-link img')).toHaveCount(0)
  const requests=failedRequests
  await page.waitForTimeout(300)
  expect(failedRequests).toBe(requests)
  fail=false
  await card.getByRole('button',{name:'Опитай отново'}).click()
  await expect.poll(()=>card.locator('.card-photo-link img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0)
  await expect(card.getByRole('button',{name:'Опитай отново'})).toHaveCount(0)
  await card.getByRole('button',{name:'Следваща снимка в обявата'}).click()
  await expect(card.locator('.card-photo-count')).toHaveText('2 / 3')
  await expect(card.locator('.card-photo-link img')).toHaveAttribute('src',/test-gallery-2/)
  // Use an unseen URL: browsers can reuse an already decoded successful image.
  await card.getByRole('button',{name:'Следваща снимка в обявата'}).click()
  await expect(card.getByRole('status').filter({hasText:'Снимката временно'})).toBeVisible()
  await card.getByRole('button',{name:'Предишна снимка в обявата'}).click()
  await expect.poll(()=>card.locator('.card-photo-link img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0)
  await expect(card.locator('.card-photo-link')).toHaveAttribute('href',/\/targove\/kola\?lot=/)
 })
}
