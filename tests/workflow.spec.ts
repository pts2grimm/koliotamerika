import { test, expect } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
let token: string
let carId: number
const password = randomBytes(24).toString('base64url')
const auth = () => ({ Authorization: `JWT ${token}` })
test.describe.configure({ mode: 'serial' })
test.beforeAll(async ({ request }) => {
 const register = await request.post('/api/users/first-register', { data: { email: 'admin@example.test', password, name: 'Test Admin' } })
 expect(register.status()).toBe(200); token = (await register.json()).token
 const image = await request.post('/api/media', { headers: auth(), multipart: { _payload: JSON.stringify({ alt: 'Тестова снимка на автомобил' }), file: { name: 'e2e-car.png', mimeType: 'image/png', buffer: await readFile('public/images/hero.png') } } })
 expect(image.status()).toBe(201)
 const imageId = (await image.json()).doc.id
 const car = await request.post('/api/cars', { headers: auth(), data: { title: 'Тестов BMW X5', slug: 'test-bmw-x5', make: 'BMW', model: 'X5', year: 2022, mileage: 45000, price: 35000, description: 'Тестов автомобил за проверка на каталога и запитванията.', status: 'published', image: imageId, seo: { title: 'BMW X5 тестова оферта', description: 'Тестово SEO описание на автомобила за проверка.' } } })
 expect(car.status()).toBe(201); carId = (await car.json()).doc.id
 const draft = await request.post('/api/cars', { headers: auth(), data: { title: 'Непубликуван автомобил', slug: 'draft-car', make: 'Ford', model: 'Mustang', year: 2020, description: 'Това е чернова и не трябва да се показва.', status: 'draft' } })
 expect(draft.status()).toBe(201)
})
test('homepage and mobile navigation render without horizontal overflow', async ({ page }) => {
 await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Следващата ти кола')
 await expect(page.getByText('Тестов BMW X5')).toBeVisible()
 await page.setViewportSize({ width: 390, height: 844 })
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
 await page.getByRole('button', { name: 'Отвори менюто' }).click()
 await page.getByRole('navigation', { name: 'Основна навигация' }).getByRole('link', { name: 'Контакти' }).click()
 await expect(page).toHaveURL(/kontakti/)
 await page.screenshot({ path: 'test-results/mobile-contact.png', fullPage: true })
})
test('catalogue filters, car metadata and draft restrictions work', async ({ page, request }) => {
 await page.goto('/avtomobili?q=BMW&budget=40000'); await expect(page.getByRole('heading', { name: 'Тестов BMW X5' })).toBeVisible()
 await expect(page.getByText('Непубликуван автомобил')).toHaveCount(0)
 await page.goto('/avtomobili?q=BMW&budget=20000'); await expect(page.getByText('Няма автомобили по тези критерии.')).toBeVisible()
 await page.goto('/avtomobili/test-bmw-x5'); await expect(page).toHaveTitle(/BMW X5 тестова оферта/)
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3100/avtomobili/test-bmw-x5')
 await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Тестово SEO описание на автомобила за проверка.')
 const draft = await request.get('/avtomobili/draft-car'); expect(draft.status()).toBe(404)
 const privateData = await request.get('/api/inquiries'); expect([401, 403]).toContain(privateData.status())
 const anonymousWrite = await request.patch(`/api/cars/${carId}`, { data: { price: 1 } }); expect([401, 403]).toContain(anonymousWrite.status())
 const directLead = await request.post('/api/inquiries', { data: { name: 'Spam' } }); expect([401, 403]).toContain(directLead.status())
})
test('visitor inquiry is persisted and only visible to authenticated staff', async ({ page, request }) => {
 await page.goto('/avtomobili/test-bmw-x5'); await page.getByRole('link', { name: 'Запитване за автомобила' }).click()
 await expect(page.locator('input[name="car"]')).toHaveValue('Тестов BMW X5')
 await page.getByLabel('Име и фамилия').fill('Тестов Клиент')
 await page.getByLabel('Телефон', { exact: false }).fill('+359888123456')
 await page.getByLabel('Имейл').fill('customer@example.test')
 await page.getByLabel('Какво търсиш?').fill('Искам информация за тестовия автомобил.')
 await page.locator('input[name="consent"]').check()
 await page.getByRole('button', { name: 'Изпрати запитване' }).click()
 await expect(page.getByRole('status')).toContainText('Запитването е получено.')
 const response = await request.get('/api/inquiries', { headers: auth() }); expect(response.ok()).toBe(true)
 const inquiries = (await response.json()).docs; expect(inquiries).toHaveLength(1); expect(inquiries[0].car).toBe('Тестов BMW X5'); expect(inquiries[0].email).toBe('customer@example.test')
 const rejected = await request.post('/api/inquiry', { data: { name: 'x' } }); expect(rejected.status()).toBe(400)
 const external = await request.post('/api/inquiry', { headers: { origin: 'https://other.example' }, data: {} }); expect(external.status()).toBe(403)
})
test('admin login and content editing work in the browser', async ({ page, request }) => {
 await page.goto('/admin/login'); await page.locator('input[name="email"]').fill('admin@example.test'); await page.locator('input[name="password"]').fill(password)
 await page.locator('button[type="submit"]').click(); await expect(page).toHaveURL(/\/admin(?:\?.*)?$/)
 await page.goto(`/admin/collections/cars/${carId}`)
 await page.locator('#field-title').fill('Тестов BMW X5 — редактиран')
 await page.locator('#action-save').click()
 await expect.poll(async () => (await (await request.get(`/api/cars/${carId}`)).json()).title).toBe('Тестов BMW X5 — редактиран')
 await page.screenshot({ path: 'test-results/admin-car.png', fullPage: true })
})
test('sitemap includes published content and legacy redirects resolve', async ({ request }) => {
 const sitemap = await request.get('/sitemap.xml'); expect(sitemap.ok()).toBe(true); const xml = await sitemap.text(); expect(xml).toContain('/avtomobili/test-bmw-x5'); expect(xml).not.toContain('draft-car')
 const add = await request.post('/api/redirects', { headers: auth(), data: { from: '/old-wordpress-page', to: '/uslugi' } }); expect(add.status()).toBe(201)
 const redirect = await request.get('/old-wordpress-page', { maxRedirects: 0 }); expect(redirect.status()).toBe(308); expect(redirect.headers().location).toBe('/uslugi')
 const robots = await request.get('/robots.txt'); expect(await robots.text()).toContain('Disallow: /admin')
})
