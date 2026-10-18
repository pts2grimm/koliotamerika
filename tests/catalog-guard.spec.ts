import {test,expect} from '@playwright/test'
test('HTTP guard counts once, limits without cookies, cannot be bypassed by prefetch headers, and preserves SEO',async({playwright,baseURL,page})=>{
 const client=await playwright.request.newContext({baseURL,extraHTTPHeaders:{'X-Real-IP':'198.51.100.88','User-Agent':'Guard-browser-test'}})
 // A small production-valid limit is supplied by this isolated fixture (30/minute).
 let count=0
 for(let i=0;i<61;i++) {
  const r=await client.get('/api/auction-models?make=BMW',{headers:i%2?{purpose:'prefetch','next-router-prefetch':'1'}:{}})
  count++
  expect(r.status()).not.toBe(503)
  if(r.status()===429) break
 }
 expect(count).toBeGreaterThanOrEqual(31)
 expect(count).toBeLessThanOrEqual(61)
 const limited=await client.get('/targove/kola?lot=12345678&site=1')
 count++
 expect(limited.status()).toBe(429)
 expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0)
 expect(limited.headers()['cache-control']).toContain('no-store')
 expect(await limited.text()).toContain('Моля, изчакай')
 expect(limited.headers()['set-cookie']).toBeUndefined()
 expect((await client.head('/api/auction-models?make=BMW',{headers:{'X-Forwarded-For':'203.0.113.111'}})).status()).toBe(429)
 count++
 for(const path of ['/','/robots.txt','/sitemap.xml','/admin/login']) expect((await client.get(path)).ok(),path).toBeTruthy()
 const other=await client.get('/api/auction-models?make=BMW',{headers:{'X-Real-IP':'198.51.100.89'}})
 expect(other.status()).not.toBe(429)
 const admin=await playwright.request.newContext({baseURL,extraHTTPHeaders:{'X-Real-IP':'198.51.100.90'}})
 const credentials={email:'guard-admin@example.test',password:'Guard-test-2026'}
 const bootstrap=await admin.post('/api/users/first-register',{data:credentials})
 if(!bootstrap.ok()){
  const login=await admin.post('/api/users/login',{data:{email:'catalog-admin@example.test',password:'Catalog-admin-2026'}})
  expect(login.ok()).toBeTruthy()
  expect((await admin.post('/api/users',{headers:{Authorization:'JWT '+(await login.json()).token},data:credentials})).ok()).toBeTruthy()
 }
 await page.goto('/admin/login')
 await page.locator('input[name=email]').fill(credentials.email)
 await page.locator('input[name=password]').fill(credentials.password)
 await page.locator('button[type=submit]').click()
 await expect(page.getByRole('heading',{name:'Обзор на сайта'})).toBeVisible()
 await page.goto('/admin/catalog-activity')
 await expect(page.getByRole('heading',{name:'Защита на каталога'})).toBeVisible()
 const row=page.locator('#catalog-protection tr').filter({hasText:'198.51.100.88'})
 await expect(row).toHaveCount(1)
 await expect(row).toContainText('Guard-browser-test')
 await expect(row.locator('td').nth(2)).toContainText(String(count))
 await expect(row.locator('td').nth(3)).toHaveText(/3/)
 await page.screenshot({path:'test-results/catalog-guard-desktop.png',fullPage:true})
 await client.dispose();await admin.dispose()
})
