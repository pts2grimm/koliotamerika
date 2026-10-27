import { test,expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
test('archive metadata and schema distinguish confirmed sale from expired date',async({request})=>{
 for(const [lot,label] of [['86000001','Продаден'],['72239476','Търгът е минал']]){
  const response=await request.get('/targove/kola?lot='+lot+'&site=1')
  expect(response.status()).toBe(200)
  const dom=new JSDOM(await response.text()),d=dom.window.document
  expect(d.querySelectorAll('h1').length).toBe(1)
  expect(d.querySelector('title')!.textContent!.length).toBeLessThanOrEqual(70)
  expect(d.querySelector('meta[name="description"]')!.getAttribute('content')).toContain(label)
  expect(d.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('http://localhost:3100/targove/kola?lot='+lot+'&site=1')
  const graph=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>JSON.parse(el.textContent!)['@graph']||[])
  const webPage=graph.find(item=>item['@type']==='WebPage')
  expect(webPage.url).toBe('http://localhost:3100/targove/kola?lot='+lot+'&site=1')
  expect(d.body.textContent).toContain('TST000000'+lot)
  expect(JSON.stringify(graph)).not.toMatch(/"(?:Vehicle|Product|Car|Offer|AggregateOffer|offers|review|aggregateRating)"/)
  expect(graph.some(item=>item['@type']==='BreadcrumbList')).toBe(true)
  expect(d.querySelector('#archived-vehicle-heading')).not.toBeNull()
  if(lot==='72239476')expect(webPage.description).not.toContain('Продаден')
  dom.window.close()
 }
})
test('sitemap index, four catalogue feeds, canonical host guard and robots discovery',async({request})=>{
 const parse=(body:string)=>{const dom=new JSDOM(body,{contentType:'text/xml'});const urls=[...dom.window.document.querySelectorAll('loc')].map(el=>el.textContent!);dom.window.close();return urls}
 const index=await request.get('/sitemap-index.xml');expect(index.status()).toBe(200)
 const children=parse(await index.text());expect(children).toHaveLength(5)
 expect(children).toContain('http://localhost:3100/sitemap.xml')
 const active=await request.get('/sitemap-auctions.xml?section=cars')
 const urls=parse(await active.text());expect(urls.length).toBeGreaterThan(0)
 expect(urls.every(url=>url.startsWith('http://localhost:3100/targove/kola?lot='))).toBe(true)
 expect(urls.some(url=>url.includes('81000000'))).toBe(false)
 expect(urls.some(url=>url.includes('84000000'))).toBe(false)
 const archive=parse(await(await request.get('/sitemap-auctions.xml?section=cars-archive')).text())
 expect(archive).toContain('http://localhost:3100/targove/kola?lot=86000001&site=1')
 const moto=parse(await(await request.get('/sitemap-auctions.xml?section=powersports')).text())
 expect(moto).toContain('http://localhost:3100/targove/kola?lot=81000000&site=1')
 expect((await request.get('/sitemap-auctions.xml?section=unknown')).status()).toBe(404)
 const before=await(await request.get('http://127.0.0.1:3199/test-requests')).json()
 const blocked=await request.get('/sitemap-auctions.xml?section=cars',{headers:{Host:'demo.hostingersite.com'}})
 expect(parse(await blocked.text())).toHaveLength(0)
 expect(parse(await(await request.get('/sitemap-index.xml',{headers:{Host:'demo.hostingersite.com'}})).text())).toHaveLength(0)
 const after=await(await request.get('http://127.0.0.1:3199/test-requests')).json();expect(after.requests.length).toBe(before.requests.length)
 const robots=await(await request.get('/robots.txt')).text()
 expect(robots).toContain('Sitemap: http://localhost:3100/sitemap-index.xml')
 expect(await(await request.get('/sitemap.xml')).text()).toContain('/blog')
 await request.post('http://127.0.0.1:3199/test-sitemap-outage?enabled=true')
 const failure=await request.get('/sitemap-auctions.xml?section=powersports-archive')
 expect(failure.status()).toBe(503)
 expect(failure.headers()['retry-after']).toBe('60')
 expect((await request.get('/sitemap.xml')).status()).toBe(200)
 await request.post('http://127.0.0.1:3199/test-sitemap-outage?enabled=false')
 const recovered=await request.get('/sitemap-auctions.xml?section=powersports-archive')
 expect(recovered.status()).toBe(200)
 expect(parse(await recovered.text())).toHaveLength(0)
})

test('active auction pages keep metadata and facts without claiming product offers',async({request})=>{
 // Zero bid, missing bid with buy-now, nonzero bid, IAAI, motorcycle and ATV.
 for(const [lot,site] of [['70000000','1'],['70000001','1'],['70000002','1'],['70000015','2'],['81000000','1'],['85000002','2']]){
  const response=await request.get('/targove/kola?lot='+lot+'&site='+site)
  expect(response.status()).toBe(200)
  const dom=new JSDOM(await response.text()),d=dom.window.document
  const schemas=[...d.querySelectorAll('script[type="application/ld+json"]')].map(el=>JSON.parse(el.textContent!))
  const graph=schemas.flatMap(value=>value['@graph']||[value])
  expect(JSON.stringify(schemas)).not.toMatch(/"(?:Vehicle|Product|Car|Offer|AggregateOffer|offers|review|aggregateRating)"/)
  const page=graph.find(item=>item['@type']==='WebPage')
  const canonical='http://localhost:3100/targove/kola?lot='+lot+'&site='+site
  expect(page.url).toBe(canonical)
  expect(page.name).toBe(d.querySelector('h1')!.textContent)
  expect(page.image.length).toBeGreaterThan(0)
  expect(d.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(canonical)
  expect(d.querySelector('meta[name="robots"]')!.getAttribute('content')).not.toContain('noindex')
  expect(graph.some(item=>item['@type']==='BreadcrumbList')).toBe(true)
  expect(graph.some(item=>item['@type']==='FAQPage')).toBe(true)
  expect(d.querySelector('.technical-facts')!.textContent).toMatch(/72\s420 км/)
  expect(d.querySelector('#vehicle-seo-heading')).not.toBeNull()
  dom.window.close()
 }
})
