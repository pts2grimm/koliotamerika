import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium, webkit } from '@playwright/test'
const base='http://localhost:3100'
mkdirSync('test-results',{recursive:true})
let ready=false
for(let i=0;i<90;i++){
 try {if((await fetch(base+'/api/admin/database-traffic')).status===403){ready=true;break}}catch{}
 await new Promise(resolve=>setTimeout(resolve,1000))
}
assert(ready,'Server did not become ready')
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch()
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'})
 // Capture the public login branding before authenticating the test administrator.
 const loginPage=await context.newPage()
 for(const theme of ['dark','light']){
  await loginPage.goto(base+'/admin/login')
  await loginPage.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme)
  const logo=loginPage.getByRole('img',{name:'Коли от Америка',exact:true})
  await logo.waitFor()
  assert(await logo.evaluate(img=>img.complete&&img.naturalWidth>0),'Login logo must load')
  await loginPage.screenshot({path:'test-results/'+name+'-login-'+theme+'.jpg',type:'jpeg',quality:75})
 }
 await loginPage.close()
 const login=await context.request.post(base+'/api/users/login',{data:{email:'mobile-admin@example.test',password:'Isolated-mobile-test-2026'},headers:{Origin:base}})
 assert.equal(login.status(),200)
 const page=await context.newPage()
 const metrics=()=>page.evaluate(()=>{
  const wrap=document.querySelector('.template-default__wrap').getBoundingClientRect()
  const nav=document.querySelector('.nav').getBoundingClientRect()
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,wrap:{x:wrap.x,width:wrap.width},nav:{x:nav.x,width:nav.width,height:nav.height},height:innerHeight}
 })
 async function waitFor(check){
  for(let i=0;i<40;i++){if(await check())return;await page.waitForTimeout(100)}
  await page.screenshot({path:'test-results/'+name+'-failed.jpg',type:'jpeg',quality:65})
  assert.fail('Layout did not reach expected state: '+JSON.stringify(await metrics()))
 }
 const open=async()=>{
  if(!await page.locator('.nav--nav-open').count())await page.locator('button.nav-toggler:visible').first().click()
  await waitFor(async()=>await page.locator('.nav--nav-open').count()===1 && await page.locator('.nav').evaluate(el=>getComputedStyle(el).opacity==='1'))
 }

 async function checkNavigation(width){
  const items=await page.locator('.nav .nav__link').evaluateAll(links=>links.filter(el=>el.getBoundingClientRect().height>0).map(el=>{
   const rect=el.getBoundingClientRect(), icon=getComputedStyle(el,'::before')
   return {id:el.id,y:rect.y,bottom:rect.bottom,height:rect.height,mask:icon.maskImage||icon.webkitMaskImage}
  }))
  for(const item of items)assert(item.mask&&item.mask!=='none','Missing navigation icon: '+item.id)
  const home=items.find(item=>item.id==='koa-nav-globals/homepage')
  const social=items.find(item=>item.id==='koa-nav-social')
  assert(home&&social&&home.mask!==social.mask,'Home and publishing need distinct icons')
  const ids=['koa-nav-overview','koa-nav-catalog-activity','koa-nav-database-traffic']
  const top=ids.map(id=>items.find(item=>item.id===id))
  assert(top.every(Boolean),'Missing analytics navigation')
  for(let i=1;i<top.length;i++){
   const gap=top[i].y-top[i-1].bottom
   assert(gap>=-1&&gap<=4,'Top navigation gap: '+gap)
  }
  for(const item of top)assert(width<768?item.height>=44&&item.height<=46:item.height>=36&&item.height<=40,'Unexpected link height: '+JSON.stringify(item))
  const pageLink=items.find(item=>item.id==='koa-nav-site-pages')
  assert(pageLink.y-home.bottom>=-1&&pageLink.y-home.bottom<=4,'Content links have excessive spacing')
  console.log('NAV_METRICS',JSON.stringify({engine:name,width,top:top.map(({id,height,y,bottom})=>({id,height,y,bottom})),contentGap:pageLink.y-home.bottom,icons:items.length}))
 }

 const close=async()=>{
  if(await page.locator('.nav--nav-open').count())await page.locator('.nav__mobile-close').click()
  await waitFor(async()=>await page.locator('.nav--nav-open').count()===0)
 }
 for(const width of [320,390,440,767]){
  await page.setViewportSize({width,height:844})
  await page.goto(base+'/admin/database-traffic')
  await page.locator('.koa-database-traffic').waitFor()
  await page.locator('.template-default--nav-hydrated').waitFor()
  await waitFor(async()=>await page.locator('.nav--nav-open').count()===0)
  await waitFor(async()=>{const m=await metrics();return Math.abs(m.wrap.width-width)<2&&Math.abs(m.wrap.x)<2&&m.document<=width+1})
  const report=await page.locator('.koa-database-traffic').boundingBox()
  assert(report.width>width-110,'Report has been squeezed')
  await page.getByRole('button',{name:'Обнови',exact:true}).click()
  await page.getByRole('button',{name:'Обнови',exact:true}).waitFor()
  const download=page.waitForEvent('download')
  await page.getByRole('button',{name:'Изтегли отчет (JSON)',exact:true}).click()
  assert((await download).suggestedFilename().endsWith('.json'))
  const before=await metrics()
  await open()
  await waitFor(async()=>{const m=await metrics();return Math.abs(m.wrap.width-before.wrap.width)<2&&Math.abs(m.wrap.x)<2&&Math.abs(m.nav.width-width)<2&&Math.abs(m.nav.height-m.height)<2})
  // The drawer must receive taps, rather than the header/report underneath it.
  assert(await page.locator('#koa-nav-database-traffic').evaluate(el=>{
   const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))
  }))
  await checkNavigation(width)
  if(width===390)await page.screenshot({path:'test-results/'+name+'-mobile-menu.jpg',type:'jpeg',quality:65})
  if(width===390){
   await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'))
   await page.waitForTimeout(300) // Wait for the navigation colour transition before visual review.
   await page.screenshot({path:'test-results/'+name+'-mobile-menu-light.jpg',type:'jpeg',quality:75})
   await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'))
  }
  await close()
  await waitFor(async()=>{const m=await metrics();return m.document<=width+1&&Math.abs(m.wrap.width-width)<2})
  if(width===390)await page.screenshot({path:'test-results/'+name+'-mobile-report.jpg',type:'jpeg',quality:65})
  // Table scroll is contained in the report, never in the page.
  assert(await page.locator('.koa-database-traffic__scroll').evaluate(el=>el.scrollWidth>el.clientWidth||el.clientWidth>=760))
  await page.locator('.koa-database-traffic__scroll').evaluate(el=>el.scrollLeft=120)
  assert((await metrics()).document<=width+1)
  console.log('PASS',name,width,'open/closed full-width content, drawer hit target, refresh, JSON download, contained table')
 }
 await open()
 await page.locator('#koa-nav-blog-posts').click()
 await page.waitForURL('**/admin/blog-posts')
 await waitFor(async()=>await page.locator('.nav--nav-open').count()===0)
 assert((await metrics()).document<=767+1)
 await page.goto(base+'/admin/collections/users')
 await page.locator('.template-default__wrap').waitFor()
 await waitFor(async()=>await page.locator('.nav--nav-open').count()===0)
 assert(Math.abs((await metrics()).wrap.width-767)<2)
 // Resizing into desktop must restore the original sidebar column.
 await page.setViewportSize({width:1536,height:1000})
 await page.goto(base+'/admin/database-traffic')
 await page.locator('.koa-database-traffic').waitFor()
 await open()
 await waitFor(async()=>{const m=await metrics();return m.wrap.x>150&&m.wrap.width>900&&m.document<=1537})
 assert.notEqual(await page.locator('.nav').evaluate(el=>getComputedStyle(el).position),'fixed')
 await checkNavigation(1536)
 await page.screenshot({path:'test-results/'+name+'-desktop.jpg',type:'jpeg',quality:60})
 console.log('PASS',name,'custom navigation, built-in collection, desktop sidebar')
 await browser.close()
}
