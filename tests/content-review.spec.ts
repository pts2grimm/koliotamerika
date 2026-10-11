import { test, expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
import snapshot from '../content/wordpress.json' with { type:'json' }
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
  const source=new JSDOM(detail.html)
  expect(doc.window.document.querySelectorAll('table').length,detail.slug).toBeGreaterThanOrEqual(source.window.document.querySelectorAll('table').length)
  expect(doc.window.document.body.textContent,detail.slug).toContain(source.window.document.querySelector('h2')!.textContent)
  doc.window.close();source.window.close()
 }
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
  for(const route of ['/', '/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena','/koli-ot-manheim','/obshti-usloviya']){
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
   await page.locator('h1').click()
   await expect(page.locator('#services-navigation')).toBeHidden()
   if(mobile)await page.getByRole('button',{name:'Отвори менюто',exact:true}).click()
   await trigger.click()
   await page.locator('#services-navigation').getByRole('link',{name:'Цени и такси за внос',exact:true}).click()
   await expect(page).toHaveURL(/vnos-na-koli-ot-amerika-cena$/)
   await expect(page.locator('#services-navigation')).toBeHidden()
   await expect(page.locator('table')).toHaveCount(4)
   await expect(page.getByText('€17 661.84',{exact:true})).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:`test-results/prices-${theme}-${width}.png`,fullPage:true})
  }
 }
})
