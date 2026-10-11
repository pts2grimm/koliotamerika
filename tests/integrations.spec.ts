import { test, expect } from '@playwright/test'

test('admin setup, consent, single page views, lead dedup IDs and revocation work in production', async ({ page, playwright, baseURL, browser }) => {
  const admin = await playwright.request.newContext({ baseURL })
  const credentials = { email: 'tracking-admin@example.test', password: 'tracking8888' }
  expect((await admin.post('/api/users/first-register', { data: { ...credentials, name: 'Tracking admin' } })).ok()).toBeTruthy()
  const login = await admin.post('/api/users/login', { data: credentials })
  const { token } = await login.json()
  const headers = { Authorization: 'JWT ' + token }
  const settingsURL = '/api/globals/integrations'
  const update = async (data: Record<string, unknown>) => {
    const response = await admin.post(settingsURL, { headers, data })
    expect(response.ok(), await response.text()).toBeTruthy()
    return (await response.json()).result
  }
  expect((await page.request.get(settingsURL)).ok()).toBeFalsy()
  await page.goto('/')
  await expect(page.getByText('Ти избираш бисквитките', { exact: true })).toHaveCount(0)
  await update({ enabled: true, hostname: 'localhost', installation: 'direct', gaEnabled: true, gaId: 'G-TEST12345',
    adsEnabled: true, adsId: 'AW-123456789', adsLeadLabel: 'TestLead123',
    pixelEnabled: true, pixelId: '12345678901', capiEnabled: false, metaAccessToken: 'test-only-token',
    clarityEnabled: true, clarityId: 'testproject1', googleVerification: 'verification-test-google-123' })
  const read = await admin.get(settingsURL, { headers })
  const stored = await read.json()
  expect(stored.metaAccessToken).toBe('')
  expect(stored.tokenConfigured).toBe(true)
  await update({ metaAccessToken: '' })
  expect((await (await admin.get(settingsURL, { headers })).json()).tokenConfigured).toBe(true)

  // Real provider scripts are replaced with empty scripts. No external account receives QA events.
  const vendors: string[] = []
  await page.route(/https:\/\/(?:www\.googletagmanager\.com|connect\.facebook\.net|www\.clarity\.ms)\//, async route => {
    vendors.push(route.request().url())
    await route.fulfill({ contentType: 'application/javascript', body: '/* provider stub */' })
  })
  const googleEvents = async (name: string) => page.evaluate(name => (window.dataLayer || []).map(item => Array.from(item as ArrayLike<unknown>)).filter(item => item[0] === 'event' && item[1] === name), name)
  await page.goto('/kontakti')
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute('content', 'verification-test-google-123')
  await expect(page.getByText('Ти избираш бисквитките', { exact: true })).toBeVisible()
  await page.waitForTimeout(500)
  expect(vendors).toEqual([])
  await page.getByRole('button', { name: 'Само необходимите', exact: true }).click()
  await page.reload()
  expect(vendors).toEqual([])
  await expect(page.getByText('Ти избираш бисквитките', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Настройки на бисквитките', exact: true }).click()
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  }
  await page.getByRole('button', { name: 'Приеми всички', exact: true }).click()
  await expect.poll(() => vendors.length).toBe(3)
  await expect.poll(async () => (await googleEvents('page_view')).length).toBe(1)
  const queue = await page.evaluate(() => (window.dataLayer || []).map(item => Array.from(item as ArrayLike<unknown>)))
  const firstConsent = queue.find(item => item[0] === 'consent' && item[1] === 'default')
  expect(firstConsent?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })

  await page.locator('input[name="name"]').fill('Test Client')
  await page.locator('input[name="email"]').fill('visitor@example.test')
  await page.locator('input[name="phone"]').fill('+359888123456')
  await page.locator('textarea[name="message"]').fill('This is a saved test inquiry.')
  await page.locator('input[name="consent"]').check()
  const saved = page.waitForResponse(r => r.url().endsWith('/api/inquiry') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Изпрати запитване', exact: false }).click()
  const response = await saved
  expect(response.status()).toBe(201)
  const { eventId } = await response.json()
  await expect.poll(async () => (await googleEvents('generate_lead')).length).toBe(1)
  const meta = await page.evaluate(() => window.fbq?.queue || [])
  const metaLead = (meta as unknown[][]).find(item => item[1] === 'Lead')
  expect(metaLead?.[3]).toEqual({ eventID: eventId })
  expect((await googleEvents('conversion'))[0][2]).toMatchObject({ transaction_id: eventId, send_to: 'AW-123456789/TestLead123' })
  const serialized = await page.evaluate(() => JSON.stringify(window.dataLayer))
  expect(serialized).not.toContain('visitor@example.test')
  expect(serialized).not.toContain('saved test inquiry')
  await page.evaluate(eventId => window.dispatchEvent(new CustomEvent('koa:lead', { detail: eventId })), eventId)
  expect((await googleEvents('generate_lead')).length).toBe(1)
  const failed = await page.request.post('/api/inquiry', { headers: { Origin: baseURL! }, data: { email: 'bad' } })
  expect(failed.status()).toBe(400)
  expect((await googleEvents('generate_lead')).length).toBe(1)

  await page.locator('footer a[href="/kak-rabotim"]').click()
  await expect(page).toHaveURL(/\/kak-rabotim$/)
  await expect.poll(async () => (await googleEvents('page_view')).length).toBe(2)
  await page.waitForTimeout(400)
  expect((await googleEvents('page_view')).length).toBe(2)

  await page.evaluate(() => { document.cookie = '_fbp=fb.1.1234567890123.123; Path=/'; document.cookie = '_ga_test=fixture; Path=/' })
  await page.getByRole('button', { name: 'Настройки на бисквитките', exact: true }).click()
  vendors.length = 0
  await page.getByRole('button', { name: 'Само необходимите', exact: true }).click()
  await page.waitForLoadState('networkidle')
  await expect.poll(() => page.evaluate(() => document.cookie)).not.toContain('_fbp')
  expect(await page.evaluate(() => document.cookie)).not.toContain('_ga_test')
  expect(vendors).toEqual([])

  // A container replaces direct browser tags rather than duplicating them.
  await update({ installation: 'gtm', gtmId: 'GTM-TEST123' })
  await page.reload()
  await page.getByRole('button', { name: 'Настройки на бисквитките', exact: true }).click()
  await page.getByRole('button', { name: 'Приеми всички', exact: true }).click()
  await expect.poll(() => vendors.length).toBe(1)
  expect(vendors[0]).toContain('/gtm.js?id=GTM-TEST123')
  expect(await page.evaluate(() => (window.dataLayer || []).filter(x => (x as { event?: string }).event === 'koa_page_view').length)).toBe(1)
  vendors.length = 0
  await page.getByRole('link', { name: 'Моят профил', exact: true }).click()
  await expect(page).toHaveURL(/\/(?:profil|vhod)/)
  await page.waitForTimeout(500)
  expect(vendors).toEqual([])

  // Preview host is blocked even with an existing visitor consent.
  await update({ hostname: 'koliotamerika.bg' })
  await page.goto('/kontakti')
  expect(vendors).toEqual([])

  // Admin UI has provider tabs and a write-only password field.
  const adminContext = await browser.newContext({ storageState: await admin.storageState() })
  const adminPage = await adminContext.newPage()
  await adminPage.goto(baseURL + '/admin/globals/integrations')
  await expect(adminPage.getByRole('heading', { name: 'Интеграции', exact: true })).toBeVisible()
  await adminPage.getByRole('tab', { name: 'Meta Pixel / CAPI', exact: true }).click()
  await expect(adminPage.locator('#integration-token')).toHaveAttribute('type', 'password')
  await expect(adminPage.locator('#integration-token')).toHaveValue('')
  await adminPage.screenshot({ path: 'test-results/integrations-admin.png', fullPage: true })
  await adminContext.close()
  await admin.dispose()
})
