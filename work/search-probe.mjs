import {chromium} from '@playwright/test'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage()
page.on('pageerror',e=>console.log('PAGE_ERROR',e.message))
page.on('response',r=>{if(new URL(r.url()).pathname==='/api/auction-models')console.log('MODELS_HTTP',r.status())})
const base='https://darkturquoise-duck-750266.hostingersite.com'
try {
 let t=Date.now()
 await page.goto(base+'/targove?make=BMW&model=X5&site=2',{timeout:90000})
 console.log('INITIAL',JSON.stringify({ms:Date.now()-t,cards:await page.locator('.auction-card').count(),error:await page.locator('.empty-state').textContent().catch(()=>null)}))
 for(const site of ['1','1,2','2']){
  const form=page.getByRole('form',{name:'Филтри за автомобили'})
  await form.locator('[name=model]').waitFor()
  await page.waitForFunction(()=>!document.querySelector('select[name=model]')?.disabled,{},{timeout:30000}).catch(()=>{})
  const model=await form.locator('[name=model]').evaluate(el=>({disabled:el.disabled,value:el.value,text:el.textContent?.slice(0,150)}))
  await form.locator('details').evaluate(el=>el.open=true)
  await form.locator('[name=site]').selectOption(site)
  t=Date.now()
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:90000}),form.getByRole('button',{name:'Намери автомобил'}).click()])
  console.log('SEARCH',JSON.stringify({site,ms:Date.now()-t,model,cards:await page.locator('.auction-card').count(),error:await page.locator('.empty-state').textContent().catch(()=>null),url:page.url()}))
 }
}finally{await browser.close()}
