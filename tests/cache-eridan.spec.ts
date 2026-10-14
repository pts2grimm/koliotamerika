import { test, expect } from '@playwright/test'
import { JSDOM } from 'jsdom'
test('warm Eridan catalogue avoids upstream calls and keeps filters, pages and failures separate',async({request})=>{
 const calls=async()=>((await(await request.get('http://127.0.0.1:3199/test-requests')).json()).requests as {path:string}[]).filter(item=>item.path==='/lots').length
 const read=async(path:string)=>{
  const start=Date.now(),response=await request.get(path),html=await response.text()
  const dom=new JSDOM(html),cards=dom.window.document.querySelectorAll('.auction-card').length
  dom.window.close()
  console.log(JSON.stringify({path,totalResponseMs:Date.now()-start,cards}))
  return {html,cards}
 }
 const first=await read('/targove?make=BMW&model=X5')
 expect(first.cards).toBe(24)
 const coldCalls=await calls();expect(coldCalls).toBeGreaterThan(0)
 expect((await read('/targove?fuel=&model=X5&make=BMW&site=1%2C2')).cards).toBe(24)
 expect(await calls()).toBe(coldCalls)
 expect((await read('/targove?make=BMW&model=X5&pagenum=2')).cards).toBe(6)
 const pageCalls=await calls();expect(pageCalls).toBeGreaterThan(coldCalls)
 expect((await read('/targove?make=BMW&seller_type=dealer')).cards).toBe(1)
 expect(await calls()).toBeGreaterThan(pageCalls)
 const beforeWarm=await calls()
 expect((await read('/targove?make=BMW&model=X5')).cards).toBe(24)
 expect(await calls()).toBe(beforeWarm)
 await request.post('http://127.0.0.1:3199/test-search-outage?enabled=true')
 expect((await read('/targove?make=BMW&year_from=2019&year_to=2023')).html).toContain('В момента търговете не се зареждат.')
 await request.post('http://127.0.0.1:3199/test-search-outage?enabled=false')
 expect((await read('/targove?make=BMW&year_from=2019&year_to=2023')).cards).toBeGreaterThan(0)
})
