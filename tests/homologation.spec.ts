import { test, expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
import snapshot from '../content/wordpress.json' with {type:'json'}
import revision from '../content/homologation-review-2026-10.json' with {type:'json'}
import { homologationRoutes, homologationImages, retiredArticle } from '../src/lib/homologation-copy'
test('public copy, metadata, internal links and sitemap contain no retired branding',async({request,page},info)=>{
 const forbidden=/технотест|tehnotest|technotest/i
 const routes=['/','/blog','/homologacia','/tag/individualno-odobryavane',...snapshot.items.filter(x=>x.slug!==retiredArticle).map(x=>'/'+x.slug)]
 for(const route of new Set(routes)){
  const response=await request.get(route)
  expect(response.status(),route).toBe(200)
  const dom=new JSDOM(await response.text()),doc=dom.window.document
  try{
   // Includes titles, metadata, structured data and SSR/RSC data, not only visible text.
   expect(doc.documentElement.outerHTML,route).not.toMatch(forbidden)
   expect(doc.querySelectorAll('h1').length,route).toBe(1)
  }finally{dom.window.close()}
 }
 for(const [from,to] of Object.entries({...homologationRoutes,...homologationImages})){
  const response=await request.get(from,{maxRedirects:0})
  expect(response.status(),from).toBe(308)
  expect(new URL(response.headers().location,'http://localhost:3100').pathname,from).toBe(to)
  expect((await request.get(to)).status(),to).toBe(200)
 }
 const paginated=await request.get('/tag/tehnotest/page/1',{maxRedirects:0})
 expect(paginated.status()).toBe(308)
 expect(paginated.headers().location).toContain('/tag/individualno-odobryavane/page/1')
 const sitemap=await(await request.get('/sitemap.xml')).text()
 expect(sitemap).not.toMatch(forbidden)
 expect(sitemap).toContain('/homologacia</loc>')
 const api=await(await request.get('/api/pages',{params:{'where[slug][equals]':retiredArticle}})).json()
 expect(api.totalDocs).toBe(0)
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900})
  await page.goto('/homologacia')
  await expect(page.locator('h1')).toHaveText(revision.title)
  await expect(page).toHaveTitle(revision.seo.title)
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content',revision.seo.description)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','http://localhost:3100/homologacia')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath('homologation-'+width+'.png'),fullPage:true})
 }
 const links=await page.locator('.landing-rich a[href^="/"]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')!))
 for(const href of new Set(links))expect((await request.get(href,{maxRedirects:0})).status(),href).toBe(200)
})
