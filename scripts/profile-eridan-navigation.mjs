import { chromium } from '@playwright/test'
const base='https://darkturquoise-duck-750266.hostingersite.com'
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
const summarizeURL=raw=>{const u=new URL(raw);return u.origin+u.pathname+(u.pathname==='/targove/kola'?'?lot='+u.searchParams.get('lot')+'&site='+u.searchParams.get('site'):'')}
for(const kind of ['desktop','mobile']){
 const context=await browser.newContext({viewport:kind==='mobile'?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:kind==='mobile'?2:1,isMobile:kind==='mobile',hasTouch:kind==='mobile'})
 const page=await context.newPage()
 page.setDefaultTimeout(45000)
 const network=[]
 let start=0
 page.on('requestfinished',async req=>{
  if(!start)return
  const type=req.resourceType()
  if(!['document','fetch','image','script'].includes(type))return
  const t=req.timing()
  if(t.responseEnd<300&&!['document','fetch'].includes(type))return
  const res=await req.response(); const h=res?.headers()||{}
  network.push({url:summarizeURL(req.url()),type,status:res?.status(),startMs:Math.round(t.startTime-start),ttfb:Math.round(t.responseStart),end:Math.round(t.responseEnd),cache:h['x-hcdn-cache-status'],nextCache:h['x-nextjs-cache'],contentType:h['content-type']})
 })
 try{
  const rootStart=Date.now()
  await page.goto(base,{waitUntil:'domcontentloaded'})
  const reject=page.getByRole('button',{name:'Само необходимите',exact:true})
  if(await reject.isVisible())await reject.click()
  const card=page.locator('.auction-card .card-photo-link').first()
  await card.waitFor({state:'visible'})
  const href=await card.getAttribute('href')
  console.log('ROOT',JSON.stringify({kind,readyMs:Date.now()-rootStart,href}))
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  start=Date.now()
  const loading=page.locator('section[aria-busy="true"]').waitFor({state:'visible',timeout:15000}).then(()=>Date.now()-start).catch(()=>null)
  await card.click({noWaitAfter:true})
  await page.locator('.detail-summary h1').waitFor({state:'visible'})
  const headingMs=Date.now()-start
  await page.locator('.gallery-open img').evaluate(img=>img.complete&&img.naturalWidth>0?undefined:new Promise(resolve=>{img.addEventListener('load',()=>resolve(),{once:true});img.addEventListener('error',()=>resolve(),{once:true})}))
  const imageMs=Date.now()-start
  await page.waitForTimeout(1500)
  console.log('CLICK',JSON.stringify({kind,href,headingMs,imageMs,loadingMs:await loading,network}))
  network.length=0
  start=Date.now()
  await page.goto(base+href,{waitUntil:'domcontentloaded'})
  await page.locator('.detail-summary h1').waitFor({state:'visible'})
  console.log('DIRECT',JSON.stringify({kind,href,headingMs:Date.now()-start,network}))
 }catch(error){console.log('PROBE_ERROR',JSON.stringify({kind,name:error.name,message:String(error.message).slice(0,600),url:summarizeURL(page.url()),text:(await page.locator('main').innerText().catch(()=>'' )).slice(0,500),network}))}
 await context.close()
}
await browser.close()
