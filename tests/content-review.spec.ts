import gallery from '../content/legacy-gallery.json' with {type:'json'}
import recovered from '../content/legacy-media-extra.json' with {type:'json'}
import examples from '../content/legacy-examples.json' with {type:'json'}
import { test, expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
import services from '../content/services-review-2026-10.json' with { type:'json' }
import snapshot from '../content/wordpress.json' with { type:'json' }
import customer from '../content/customer-pricing-2026-10.json' with { type:'json' }
import plain from '../content/plain-language-2026-10.json' with { type:'json' }
import details from '../content/pricing-details-2026-10.json' with { type:'json' }
import revisions from '../content/content-review-2026-10.json' with { type:'json' }

test('all public content has working contextual links, metadata and one H1',async({request,page},testInfo)=>{
 const base='http://localhost:3100'
 const routes=new Set(['/', '/blog','/uslugi','/kak-rabotim','/kontakti','/kalkulator','/targove','/avtomobili',...snapshot.items.map(p=>'/'+p.slug)])
 const documents=new Map<string,string>()
 const internal=new Map<string,Set<string>>()
 const external=new Set<string>()
 for(const route of routes){
  const response=await request.get(route)
  expect(response.status(),route).toBe(200)
  const html=await response.text(); documents.set(route,html)
  const dom=new JSDOM(html), doc=dom.window.document
  try{
   expect(doc.querySelectorAll('h1').length,route).toBe(1)
   expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href'),route).toBe(base+(route === '/' ? '' : route))
   expect(doc.querySelector('meta[name=description]')?.getAttribute('content')?.length,route).toBeGreaterThan(30)
   const revision=revisions.find(r=>'/'+r.slug===route)
   if(revision && 'title' in revision && revision.title) expect(doc.querySelector('h1')?.textContent).toBe(revision.title)
   for(const link of doc.querySelectorAll('a[href]')){
    const href=link.getAttribute('href')!
    if(/^(mailto:|tel:|viber:)/.test(href))continue
    const url=new URL(href,base+route)
    if(url.origin!==base){if(url.protocol==='https:'||url.protocol==='http:')external.add(url.href);continue}
    if (['/profil','/vhod','/registracia'].includes(url.pathname)) continue
    const key=url.pathname+url.search+url.hash
    if(!internal.has(key))internal.set(key,new Set())
    internal.get(key)!.add(route)
   }
  }finally{dom.window.close()}
 }
 for(const detail of details) {
  const doc=new JSDOM(documents.get('/'+detail.slug)!)
  const source=new JSDOM(services.find(item=>item.slug===detail.slug)?.html ?? customer.find(item=>item.slug===detail.slug)?.html ?? plain.find(item=>item.slug===detail.slug)?.html ?? detail.html)
  expect(doc.window.document.querySelectorAll('table').length,detail.slug).toBeGreaterThanOrEqual(source.window.document.querySelectorAll('table').length)
  expect(doc.window.document.body.textContent,detail.slug).toContain(source.window.document.querySelector('h2,h3')!.textContent)
  if(customer.some(item=>item.slug===detail.slug)) {
   // Assert the server response, before clicks: collapsed sections must already contain the copy.
   expect(doc.window.document.body.textContent).toContain('Наша цена за покупка и обработка')
   expect(doc.window.document.body.textContent).not.toMatch(/secured|clean/i)
   expect(doc.window.document.querySelector('table')?.querySelectorAll('th').length).toBe(2)
  }
  doc.window.close();source.window.close()
 }
 const serviceAudit:{slug:string;title:string;description:string;words:number}[]=[]
 for(const service of services){
  const dom=new JSDOM(documents.get('/'+service.slug)!),doc=dom.window.document
  const source=new JSDOM(service.html)
  expect(doc.querySelector('title')?.textContent,service.slug).toBe(service.expectedSEOtitle)
  expect(doc.querySelector('h1')?.textContent,service.slug).toBe(service.expectedTitle)
  expect(doc.querySelector('meta[name=description]')?.getAttribute('content'),service.slug).toBe(service.seoDescription)
  // These checks read the initial HTML, including any collapsed content.
  for(const heading of source.window.document.querySelectorAll('h2,h3')) expect(doc.body.textContent,service.slug).toContain(heading.textContent)
  expect(doc.querySelectorAll('table').length,service.slug).toBe(source.window.document.querySelectorAll('table').length)
  const scripts=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(node=>JSON.parse(node.textContent!))
  const article=scripts.flatMap(item=>item['@graph']||[item]).find(item=>item['@type']==='BlogPosting'||item['@type']==='Article')
  if(['morski-transport-na-avtomobili-ot-sasht','zastrahovka-na-avtomobili-ot-sasht'].includes(service.slug)) {
   expect(article,service.slug).toBeTruthy()
   expect(article.dateModified,service.slug).toBeTruthy()
   expect(article.datePublished,service.slug).toBeTruthy()
  }
  serviceAudit.push({slug:service.slug,title:doc.querySelector('title')!.textContent!,description:service.seoDescription,words:source.window.document.body.textContent!.trim().split(/\s+/).length})
  dom.window.close();source.window.close()
 }
 expect(new Set(serviceAudit.map(x=>x.title)).size).toBe(services.length)
 expect(new Set(serviceAudit.map(x=>x.description)).size).toBe(services.length)
 await testInfo.attach('services-seo-audit.json',{body:JSON.stringify(serviceAudit,null,2),contentType:'application/json'})
 const broken:string[]=[]
 for(const [href,from] of internal){
  const url=new URL(href,base),target=url.pathname+url.search
  let html=documents.get(target)
  if(!html){
   const response=await request.get(target,{maxRedirects:0})
   if(response.status()!==200){broken.push(href+' status '+response.status()+' from '+[...from].join(','));continue}
   html=await response.text();documents.set(target,html)
  }
  if(url.hash){
   const dom=new JSDOM(html)
   if(!dom.window.document.getElementById(decodeURIComponent(url.hash.slice(1))))broken.push(href+' missing fragment from '+[...from].join(','))
   dom.window.close()
  }
 }
 await testInfo.attach('content-link-audit.json',{body:JSON.stringify({pages:routes.size,internal:internal.size,external:[...external],broken},null,2),contentType:'application/json'})
 console.log('CONTENT_AUDIT',JSON.stringify({pages:routes.size,internal:internal.size,external:external.size,broken}))
 expect(broken).toEqual([])
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900})
  for(const route of ['/', '/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena','/koli-ot-manheim','/obshti-usloviya',...services.map(item=>'/'+item.slug)]){
   await page.goto(route)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' width '+width).toBe(true)
  }
 }
 await page.goto('/')
 await expect(page.locator('.home-news-grid article')).toHaveCount(3)
 const robots=await(await request.get('/robots.txt')).text()
 expect(robots).toContain('Allow: /api/media/file/')
 expect(robots).toContain('Disallow: /admin')
 const sitemap=await(await request.get('/sitemap.xml')).text()
 for(const item of snapshot.items) expect(sitemap,item.slug).toContain(base+'/'+item.slug)
 expect(sitemap).not.toContain('hostingersite.com')
})

test('services dropdown supports keyboard, outside click and mobile navigation in both themes',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900})
  for(const theme of ['light','dark']){
   await page.goto('/')
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme)
   const mobile=width<1051
   if(mobile)await page.getByRole('button',{name:'Отвори менюто',exact:true}).click()
   const trigger=page.getByRole('button',{name:'Услуги',exact:true})
   await trigger.focus()
   await page.keyboard.press('Enter')
   await expect(trigger).toHaveAttribute('aria-expanded','true')
   const all=page.locator('#services-navigation').getByRole('link',{name:'Всички услуги',exact:true})
   await page.keyboard.press('Tab')
   await expect(all).toBeFocused()
   await page.keyboard.press('Escape')
   await expect(trigger).toBeFocused()
   await expect(trigger).toHaveAttribute('aria-expanded','false')
   await trigger.click()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:`test-results/services-${theme}-${width}.png`})
   await page.mouse.click(1,890)
   await expect(page.locator('#services-navigation')).toBeHidden()
   if(mobile)await page.getByRole('button',{name:'Отвори менюто',exact:true}).click()
   await trigger.click()
   await page.locator('#services-navigation').getByRole('link',{name:'Цени и такси за внос',exact:true}).click()
   await expect(page).toHaveURL(/vnos-na-koli-ot-amerika-cena$/)
   await expect(page.locator('#services-navigation')).toBeHidden()
   await expect(page.locator('table')).toHaveCount(5)
   await expect(page.getByText('€18 335.44',{exact:true})).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:`test-results/prices-${theme}-${width}.png`,fullPage:true})
  }
 }
})

test('gallery and recovered photos render before JavaScript and filter on mobile',async({request,page},testInfo)=>{
 const response=await request.get('/koli-ot-amerika-galeriya')
 const dom=new JSDOM(await response.text())
 expect(dom.window.document.querySelectorAll('#gallery-photos figure')).toHaveLength(41)
 expect(dom.window.document.querySelectorAll('#gallery-photos img')).toHaveLength(41)
 expect(dom.window.document.querySelectorAll('.landing-rich a[href="/"]')).toHaveLength(0)
 dom.window.close()
 for(const media of recovered.records){
  const r=await request.get(media.path)
  expect(r.status(),media.path).toBe(200)
  expect(r.headers()['content-type'],media.path).toMatch(/^image\//)
 }
 for(const [slug,photos] of Object.entries(examples)){
  const dom=new JSDOM(await(await request.get('/'+slug)).text())
  expect(dom.window.document.querySelectorAll('.legacy-examples figure'),slug).toHaveLength(photos.length)
  dom.window.close()
 }
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900})
  for(const theme of ['light','dark']){
   await page.goto('/koli-ot-amerika-galeriya')
   await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme)
   await expect(page.locator('#gallery-photos figure')).toHaveCount(41)
   await page.getByLabel('Марка',{exact:true}).selectOption('BMW')
   await expect(page.locator('#gallery-photos figure')).toHaveCount(gallery.items.filter(x=>x.brand==='BMW').length)
   await page.locator('#gallery-photos').scrollIntoViewIfNeeded()
   await expect(page.locator('#gallery-photos img').first()).toBeVisible()
   await expect.poll(()=>page.locator('#gallery-photos img').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:`test-results/gallery-${theme}-${width}.png`})
   await page.getByLabel('Марка',{exact:true}).selectOption('')
   await expect(page.getByRole('status')).toContainText('41 от 41')
  }
 }
 await page.goto('/kontakti')
 await expect(page.locator('.contact-methods')).toContainText('Pontus LLC')
 await expect(page.locator('.contact-methods a[href="tel:+359888292280"]')).toHaveCount(1)
 await expect(page.locator('a[href="tel:+359895668821"]')).toHaveCount(0)
 await expect(page.getByRole('link',{name:'Отвори картата',exact:true})).toHaveAttribute('href',/google.com\/maps\/search/)
 await expect(page.getByRole('link',{name:'Отзиви и профил в Google',exact:true})).toHaveAttribute('href',/ChIJXf7M8N24eyIRGQWGyPD0i9U/)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 console.log('RECOVERED_MEDIA',JSON.stringify({files:recovered.records.length,gallery:gallery.items.length,examples:Object.values(examples).flat().length}))
})
