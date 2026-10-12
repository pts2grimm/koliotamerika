import { test, expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
import services from '../content/services-review-2026-10.json' with { type: 'json' }
const slug='morski-transport-na-avtomobili-ot-sasht'
const path='/'+slug
const normalize=(value:string|null)=>value?.replace(/\s+/g,' ').trim()
test('sea transport keeps every editorial section, price, link and article SEO in the server HTML',async({request})=>{
 const response=await request.get(path)
 expect(response.status()).toBe(200)
 const dom=new JSDOM(await response.text()),doc=dom.window.document
 const source=services.find(s=>s.slug===slug)!
 const original=new JSDOM(source.html)
 try{
  expect(doc.querySelectorAll('h1')).toHaveLength(1)
  expect(doc.querySelector('h1')?.textContent).toBe(source.expectedTitle)
  expect(doc.title).toBe(source.expectedSEOtitle)
  expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).toBe(source.seoDescription)
  expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('http://localhost:3100'+path)
  expect(doc.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article')
  const text=normalize(doc.querySelector('.landing-chapters')?.textContent||'')
  for(const node of original.window.document.querySelectorAll('h2,p,li,td,th'))expect(text).toContain(normalize(node.textContent))
  const expectedCells=[...original.window.document.querySelectorAll('td,th')].map(el=>normalize(el.textContent))
  expect([...doc.querySelectorAll('.landing-chapters td,.landing-chapters th')].map(el=>normalize(el.textContent))).toEqual(expectedCells)
  for(const link of original.window.document.querySelectorAll('a[href]'))expect(doc.querySelector('.landing-chapters a[href="'+link.getAttribute('href')+'"]')).not.toBeNull()
  const graph=[...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>{const data=JSON.parse(el.textContent!);return data['@graph']||[data]})
  const articles=graph.filter(el=>el['@type']==='BlogPosting')
  expect(articles).toHaveLength(1)
  expect(articles[0].datePublished).toBeTruthy()
  expect(articles[0].dateModified).toBeTruthy()
  expect(graph.filter(el=>el['@type']==='BreadcrumbList')).toHaveLength(1)
  expect(doc.querySelectorAll('.sea-route li')).toHaveLength(3)
  expect(doc.querySelector('.article-more')).not.toBeNull()
 }finally{dom.window.close();original.window.close()}
})
test('sea transport layout, anchors and price table work on phones and desktops in both themes',async({page,context})=>{
 await context.addCookies([{name:'koa-consent',value:encodeURIComponent(JSON.stringify({version:1,analytics:false,marketing:false,updatedAt:Date.now()})),domain:'localhost',path:'/'}])
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 for(const width of [320,390,768,1440]){
  for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:950})
   await page.goto(path)
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
   await expect(page.locator('.sea-transport-page')).toBeVisible()
   await expect.poll(()=>page.locator('.landing-hero-image img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   const title=await page.locator('h1').boundingBox()
   if(width<=390)expect(title!.height).toBeLessThan(240)
   const navigation=page.getByRole('navigation',{name:'На тази страница',exact:true})
   expect(await navigation.locator('a').count()).toBe(7)
   for(const href of await navigation.locator('a').evaluateAll(els=>els.map(el=>el.getAttribute('href')!)))await expect(page.locator(href)).toHaveCount(1)
   await page.screenshot({path:`test-results/sea-${theme}-${width}.png`,fullPage:true})
   if(width===390||width===1440&&theme==='light')console.log('SEA_AFTER_'+theme+'_'+width+' '+(await page.screenshot({type:'jpeg',quality:50})).toString('base64'))
   await page.getByRole('link',{name:'Цени и разбивка',exact:true}).click()
   await expect(page).toHaveURL(/#topic-4$/)
   const table=page.getByRole('region',{name:'Таблица с разбивка — превърти хоризонтално при нужда'})
   await expect(table).toBeVisible()
   const box=await table.boundingBox()
   expect(box!.x).toBeGreaterThanOrEqual(0)
   expect(box!.x+box!.width).toBeLessThanOrEqual(width+1)
   if(width<=390){
    await table.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0)
    await table.evaluate(el=>{el.scrollLeft=0})
   }
   if(width===390&&theme==='dark'){
    await table.scrollIntoViewIfNeeded()
    console.log('SEA_TABLE '+(await page.screenshot({type:'jpeg',quality:50})).toString('base64'))
   }
  }
 }
 await page.getByRole('link',{name:'Поискай транспортна оферта',exact:true}).click()
 await expect(page).toHaveURL(/\/kontakti$/)
 await expect(page.locator('form')).toBeVisible()
 // Shared hero props must leave other pages on their existing templates.
 await page.goto('/homologacia')
 await expect(page.locator('.landing-page')).toBeVisible()
 await expect(page.locator('.sea-transport-page')).toHaveCount(0)
 await page.goto('/koli-ot-manheim')
 await expect(page.locator('.article-body')).toBeVisible()
 await expect(page.locator('.landing-page')).toHaveCount(0)
 expect(errors).toEqual([])
})
