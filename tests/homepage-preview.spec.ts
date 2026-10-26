import {test,expect} from '@playwright/test'

test('native full-page live preview updates unsaved content without database writes',async({page,request,browser})=>{
 page.setDefaultTimeout(15000)
 page.setDefaultNavigationTimeout(30000)
 await page.setViewportSize({width:1920,height:1080})
 const origin={origin:'http://localhost:3100'}
 const guest=await request.get('/home-preview')
 expect(guest.status()).toBe(404)
 expect(guest.headers()['x-robots-tag']).toContain('noindex')
 expect(await guest.text()).not.toContain('home-live-status')
 const email='preview-admin@example.test',password='Preview-fixture-only-123'
 expect((await request.post('/api/users/first-register',{data:{email,password}})).status()).toBe(200)
 await page.goto('/admin/login',{waitUntil:'domcontentloaded'})
 await page.locator('input[name=email]').fill(email)
 await page.locator('input[name=password]').fill(password)
 await page.getByRole('button',{name:/Вход|Log in|Login/i}).click()
 await expect(page).not.toHaveURL(/\/admin\/login/)
 await page.goto('/admin/globals/homepage',{waitUntil:'domcontentloaded'})
 const saved=await (await page.request.get('/api/globals/homepage')).json()
 console.log('PREVIEW_STEP editor')
 await page.locator('#live-preview-toggler').click()
 const frame=page.frameLocator('#live-preview-iframe')
 await expect(frame.locator('.home-live-status')).toContainText('реално време',{timeout:30000})
 await expect(frame.locator('h1')).toHaveText(saved.hero.title)
 await expect(frame.locator('.site-header')).toBeVisible()
 await expect(frame.locator('footer')).toBeAttached()
 expect(await frame.locator('script[src*="googletagmanager"],script[src*="connect.facebook"]').count()).toBe(0)
 const previewResponse=await page.request.get('/home-preview')
 expect(previewResponse.status()).toBe(200)
 expect(previewResponse.headers()['cache-control']).toContain('no-store')
 console.log('PREVIEW_STEP ready')
 await page.locator('.collapsible').filter({has:page.getByText('Първи екран',{exact:true})}).first().locator('.collapsible__toggle').first().click()
 let reads=0,writes=0
 page.on('request',r=>{
  if(r.url().includes('/api/globals/homepage')&&['POST','PATCH'].includes(r.method()))writes++
  if(r.url().includes('/api/')&&r.frame()?.url().includes('/home-preview'))reads++
 })
 const title=page.locator('#field-hero__title')
 await title.fill('Незапазен първи екран')
 await expect(frame.locator('h1')).toHaveText('Незапазен първи екран')
 await title.fill('Втора редакция в реално време')
 await expect(frame.locator('h1')).toHaveText('Втора редакция в реално време')
 expect(reads).toBe(0)
 expect(writes).toBe(0)
 expect((await (await page.request.get('/api/globals/homepage')).json()).hero.title).toBe(saved.hero.title)
 expect(await (await request.get('/')).text()).not.toContain('Втора редакция в реално време')
 console.log('PREVIEW_STEP unsaved')
 // Exercise sections and arrays through the same authenticated parent protocol.
 await page.evaluate(data=>{
  const target=(document.getElementById('live-preview-iframe') as HTMLIFrameElement).contentWindow!
  target.postMessage({type:'payload-live-preview',globalSlug:'homepage',data},location.origin)
 },{...saved,hero:{...saved.hero,title:'Преглед на секциите'},services:{...saved.services,enabled:false},faq:{...saved.faq,items:[]}})
 await expect(frame.locator('h1')).toHaveText('Преглед на секциите')
 await expect(frame.locator('.home-service-cards')).toHaveCount(0)
 await expect(frame.locator('.home-faq details')).toHaveCount(0)
 // Untrusted windows/origins cannot overwrite the preview.
 const previewFrame=page.frames().find(f=>f.url().includes('/home-preview'))!
 await previewFrame.evaluate(()=>{
  window.dispatchEvent(new MessageEvent('message',{origin:'https://invalid.example',source:parent,data:{type:'payload-live-preview',globalSlug:'homepage',data:{hero:{title:'UNTRUSTED'}}}}))
  window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{type:'payload-live-preview',globalSlug:'homepage',data:{hero:{title:'UNTRUSTED'}}}}))
 })
 await page.waitForTimeout(150)
 await expect(frame.locator('h1')).toHaveText('Преглед на секциите')
 await page.locator('.live-preview-toolbar-controls__breakpoint button').first().click()
 await page.getByRole('button',{name:'Телефон',exact:true}).click()
 await expect.poll(()=>previewFrame.evaluate(()=>innerWidth)).toBe(390)
 expect(await previewFrame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 console.log('PREVIEW_STEP mobile')
 // Native form changes still work after switching viewport.
 await title.fill('Запазен след преглед')
 await expect(frame.locator('h1')).toHaveText('Запазен след преглед')
 const response=page.waitForResponse(r=>r.url().includes('/api/globals/homepage')&&['POST','PATCH'].includes(r.request().method()))
 await page.getByRole('button',{name:/^(Запази|Save)$/}).first().click()
 expect((await response).ok()).toBe(true)
 expect((await (await page.request.get('/api/globals/homepage')).json()).hero.title).toBe('Запазен след преглед')
 await expect.poll(async()=> (await (await request.get('/')).text()).includes('Запазен след преглед'),{timeout:40000}).toBe(true)
 console.log('PREVIEW_STEP saved')
 const customer=await browser.newContext()
 expect((await customer.request.post('/api/account/register',{headers:origin,data:{email:'preview-customer@example.test',name:'Fixture',password,consent:true}})).status()).toBe(200)
 expect((await customer.request.get('/home-preview')).status()).toBe(404)
 await customer.close()
})
