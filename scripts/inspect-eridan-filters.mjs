import { chromium } from 'playwright'
import fs from 'node:fs'
const spec=await (await fetch('https://catalog.eridan.software/api/openapi.json')).json()
console.log('OPENAPI',JSON.stringify({info:spec.info,paths:Object.keys(spec.paths),lots:spec.paths['/api/lots']||spec.paths['/lots'],models:spec.paths['/api/models']||spec.paths['/models']}))
for(const [k,v] of Object.entries(spec.components?.schemas||{})){if(/Lot|Filter|Highlight/i.test(k))console.log('SCHEMA',k,JSON.stringify(v))}
for(const filename of ['node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md','node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md']){
 if(fs.existsSync(filename))console.log('NEXT_GUIDE',filename,fs.readFileSync(filename,'utf8').slice(0,18000))
}
const browser=await chromium.launch()
const page=await browser.newPage()
page.on('pageerror',e=>console.log('BROWSER_ERROR',e.message.slice(0,300)))
page.on('response',res=>{if(res.url().includes('/api/auction-models'))console.log('MODELS_RESPONSE',res.status())})
const base='https://darkturquoise-duck-750266.hostingersite.com'
async function report(label){
 await page.waitForTimeout(700)
 const cards=page.locator('.auction-card')
 console.log('BROWSER',JSON.stringify({label,url:page.url(),count:await cards.count(),badges:await cards.locator('.car-badge').allTextContents(),titles:(await cards.locator('h3').allTextContents()).slice(0,4),empty:await page.locator('.empty-state').allTextContents(),filters:await page.locator('.auction-filters').evaluateAll(forms=>forms.map(f=>[...new FormData(f)].map(([k,v])=>[k,v])))}))
}
await page.goto(base+'/targove',{waitUntil:'networkidle',timeout:60000})
await report('default')
const filters=page.getByRole('form',{name:'Филтри за автомобили'})
if(!await filters.getByLabel('Аукцион',{exact:true}).isVisible())await filters.locator('summary').click()
await filters.getByLabel('Аукцион',{exact:true}).selectOption('2')
await filters.getByRole('button',{name:'Намери автомобил'}).click()
await page.waitForLoadState('networkidle')
await report('iaai-form')
await filters.getByRole('combobox',{name:'Марка',exact:true}).selectOption('BMW')
await page.waitForTimeout(2000)
console.log('MODEL_OPTIONS',(await filters.locator('[name=model]').evaluateAll(elements=>elements.map(e=>({tag:e.tagName,disabled:e.disabled,options:e.tagName==='SELECT'?[...e.options].map(o=>o.value):[]})))))
if(await filters.locator('select[name=model] option[value=X5]').count())await filters.locator('select[name=model]').selectOption('X5')
else if(await filters.locator('input[name=model]').count())await filters.locator('input[name=model]').fill('X5')
await filters.getByRole('button',{name:'Намери автомобил'}).click()
await page.waitForLoadState('networkidle')
await report('bmw-x5-iaai-form')
await browser.close()
