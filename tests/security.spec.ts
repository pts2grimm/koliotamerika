import { test, expect } from '@playwright/test'

test('hardening preserves public SEO, admin login, reset mail and legitimate forms', async ({page,playwright,baseURL})=>{
 const admin=await playwright.request.newContext({baseURL,extraHTTPHeaders:{'X-Real-IP':'198.51.100.201'}})
 const origin={Origin:baseURL!}
 const credentials={email:'security-admin@example.test',password:'Security-test-2026'}
 // Another suite may already have bootstrapped this isolated database.
 const bootstrap=await admin.post('/api/users/first-register',{data:credentials})
 if(!bootstrap.ok()){
  const login=await admin.post('/api/users/login',{data:{email:'catalog-admin@example.test',password:'Catalog-admin-2026'}})
  expect(login.ok()).toBeTruthy()
  expect((await admin.post('/api/users',{data:credentials})).ok()).toBeTruthy()
 }
 for(const path of ['/','/blog','/robots.txt','/sitemap.xml']){
  const response=await admin.get(path)
  expect(response.ok(),path).toBeTruthy()
  expect(response.headers()['content-security-policy']).toContain("object-src 'none'")
  expect(response.headers()['x-content-type-options']).toBe('nosniff')
  expect(response.headers()['permissions-policy']).toContain('camera=()')
 }
 for(const path of ['/.env','/.git/config','/wp-login.php','/xmlrpc.php']){
  expect((await admin.get(path)).status(),path).toBe(404)
 }
 for(const path of ['/api/inquiries','/api/bills-of-sale','/api/catalog-events','/api/consent-events','/api/submission-limits','/api/globals/integrations']){
  const visitor=await playwright.request.newContext({baseURL})
  expect((await visitor.get(path)).status(),path).toBe(403)
  await visitor.dispose()
 }
 expect((await admin.post('/api/users/login',{headers:{Origin:'https://attacker.example'},data:credentials})).status()).toBe(403)
 expect((await admin.post('/api/users/login',{headers:origin,data:{...credentials,padding:'x'.repeat(17000)}})).status()).toBe(413)
 expect((await admin.post('/api/users/login',{headers:origin,data:{...credentials,password:'x'.repeat(129)}})).status()).toBe(400)
 expect((await admin.post('/api/users/login',{headers:origin,data:credentials})).ok()).toBeTruthy()
 await page.goto('/admin/login')
 await page.locator('input[name=email]').fill(credentials.email)
 await page.locator('input[name=password]').fill(credentials.password)
 await page.locator('button[type=submit]').click()
 await expect(page.getByRole('heading',{name:'Обзор на сайта'})).toBeVisible()
 // SMTP fixture captures mail only; never uses live addresses or sends externally.
 expect((await admin.post('/api/users/forgot-password',{headers:origin,data:{email:credentials.email}})).ok()).toBeTruthy()
 const messages=await (await admin.get('http://127.0.0.1:3199/test-mail')).json()
 expect(JSON.stringify(messages)).toContain(credentials.email)
 const mail=messages.messages.find((m:{recipient:string})=>m.recipient.includes(credentials.email))
 const [mailHeaders,...parts]=mail.message.split('\r\n\r\n')
 const decoded=mailHeaders.includes('Content-Transfer-Encoding: base64')?Buffer.from(parts.join('\r\n\r\n'),'base64').toString('utf8'):parts.join('\r\n\r\n').replace(/=\r\n/g,'').replace(/=3D/g,'=')
 const token=decoded.match(/reset\/([a-f0-9]{40})/)?.[1]
 expect(token).toBeTruthy()
 const newPassword='Security-reset-2026'
 expect((await admin.post('/api/users/reset-password',{headers:origin,data:{token,password:newPassword}})).ok()).toBeTruthy()
 expect((await admin.post('/api/users/login',{headers:origin,data:{email:credentials.email,password:newPassword}})).ok()).toBeTruthy()
 expect((await admin.post('/api/users/reset-password',{headers:origin,data:{token,password:'Another-test-2026'}})).ok()).toBeFalsy()
 // Per-email quota applies across different trusted IPs. Payload returns the same success
 // response for unknown addresses, so the test never relies on account enumeration.
 for(let i=0;i<6;i++){
  const response=await admin.post('/api/users/forgot-password',{headers:{...origin,'X-Real-IP':'198.51.100.'+(210+i)},data:{email:'not-a-user@example.test'}})
  expect(response.status()).toBe(i<5?200:429)
  if(i===5)expect(response.headers()['retry-after']).toBe('3600')
 }
 const data={name:'Проверка защита',email:'security-inquiry@example.test',phone:'+359888123456',message:'Тест на защитата на запитванията.',consent:true}
 expect((await admin.post('/api/inquiry',{data})).status()).toBe(403)
 expect((await admin.post('/api/inquiry',{headers:{...origin,'Sec-Fetch-Site':'cross-site'},data})).status()).toBe(403)
 expect((await admin.post('/api/inquiry',{headers:origin,data:{...data,website:'spam.example'}})).status()).toBe(400)
 const responses=await Promise.all(Array.from({length:10},(_,i)=>admin.post('/api/inquiry',{headers:{...origin,'X-Real-IP':'198.51.100.240','X-Forwarded-For':'203.0.113.'+i},data})))
 expect(responses.filter(r=>r.status()===201)).toHaveLength(5)
 expect(responses.filter(r=>r.status()===429)).toHaveLength(5)
 await admin.dispose()
})
