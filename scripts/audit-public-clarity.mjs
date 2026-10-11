import { JSDOM } from 'jsdom'
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const base='https://papayawhip-ram-220810.hostingersite.com'
const dir='reports/public-clarity'
await mkdir(dir,{recursive:true})
const paths=['/','/uslugi','/vnos-na-koli-ot-usa','/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena','/proverka-na-istoriya-na-avtomobil','/homologacia','/vnos-na-motori-ot-sasht','/morski-transport-na-avtomobili-ot-sasht','/kak-rabotim','/kalkulator','/kontakti','/galeriya','/amerikanski-sajt-za-koli','/blog','/chesto-zadavani-vuprosi','/obshti-usloviya','/politika-za-poveritelnost','/robots.txt','/sitemap.xml']
const results=[]
for(const path of paths){
 try{
 const res=await fetch(base+path,{signal:AbortSignal.timeout(45000)})
 const html=await res.text()
 if(path.endsWith('.txt')||path.endsWith('.xml')){const row={path,status:res.status,text:html.slice(0,15000)};results.push(row);console.log(JSON.stringify(row));continue}
 const d=new JSDOM(html,{url:res.url}).window.document
 const main=d.querySelector('main')||d.body
 const links=[...d.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')}))
 const sections=[...main.querySelectorAll('h1,h2,h3')].map(e=>({tag:e.tagName,text:e.textContent.trim()}))
 const row={path,status:res.status,url:res.url,title:d.title,description:d.querySelector('meta[name=description]')?.content,robots:d.querySelector('meta[name=robots]')?.content,canonical:d.querySelector('link[rel=canonical]')?.href,sections,links:links.filter(a=>!a.href.includes('/targove/')),text:main.textContent.replace(/\s+/g,' ').slice(0,50000),consent:d.body.textContent.includes('Настройки на бисквитките'),forms:[...main.querySelectorAll('form')].map(f=>[...f.querySelectorAll('input,textarea,select')].map(e=>({name:e.name,type:e.type,required:e.required})))}
 results.push(row)
 console.log(JSON.stringify({...row,text:row.text.slice(0,path==='/'?24000:8500),links:undefined}))
 }catch(e){const row={path,error:String(e)};results.push(row);console.log(JSON.stringify(row))}
}
await writeFile(dir+'/pages.json',JSON.stringify(results,null,2))
const browser=await chromium.launch()
const page=await browser.newPage()
await page.route(/google-analytics|googletagmanager|connect\.facebook|clarity\.ms/,r=>r.abort())
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
for(const width of [390,320,1440]){
 await page.setViewportSize({width,height:900})
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000})
 await page.waitForTimeout(2500)
 const row=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,headings:[...document.querySelectorAll('main h1,main h2')].map(e=>({text:e.textContent,y:Math.round(e.getBoundingClientRect().top+scrollY)})),brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),firstScreen:document.body.innerText.slice(0,2200)}))
 if(width<500){const menu=page.getByRole('button',{name:'Отвори менюто'});if(await menu.count()){await menu.click();await page.getByRole('button',{name:'Услуги',exact:true}).click();row.mobileServices=await page.locator('#services-navigation').innerText();await page.getByRole('button',{name:'Затвори менюто'}).click()}}
 await page.screenshot({path:dir+'/home-'+width+'.png',fullPage:true})
 console.log('BROWSER '+JSON.stringify(row))
}
console.log('PAGE_ERRORS '+JSON.stringify(errors))
await browser.close()
