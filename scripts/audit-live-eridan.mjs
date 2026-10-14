import { mkdir,writeFile } from 'node:fs/promises'
import { resolveTxt,resolveMx,resolveNs } from 'node:dns/promises'
import { JSDOM } from 'jsdom'
import { chromium } from '@playwright/test'
const origin='https://koliotamerika.bg'
const report={at:new Date().toISOString(),dns:{},pages:[],sitemaps:[],browser:{},errors:[]}
const get=async(url,redirect='manual')=>{const start=Date.now();const r=await fetch(url,{redirect,signal:AbortSignal.timeout(25000)});return {r,ms:Date.now()-start,text:await r.text()}}
const readPage=async(path)=>{
 const {r,text,ms}=await get(new URL(path,origin))
 const d=new JSDOM(text),doc=d.window.document
 const metas=name=>doc.querySelector('meta[name="'+name+'"]')?.getAttribute('content')||''
 const links=[...doc.querySelectorAll('a[href]')].map(x=>x.getAttribute('href'))
 const schema=[];let schemaErrors=0
 for(const s of doc.querySelectorAll('script[type="application/ld+json"]'))try{const j=JSON.parse(s.textContent);schema.push(...(j['@graph']||[j]).map(x=>x['@type']))}catch{schemaErrors++}
 const row={path,status:r.status,ms,location:r.headers.get('location'),xRobots:r.headers.get('x-robots-tag'),lang:doc.documentElement.lang,title:doc.title,description:metas('description'),robots:metas('robots'),h1:[...doc.querySelectorAll('h1')].map(x=>x.textContent),canonical:doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),googleVerification:!!metas('google-site-verification'),schema,schemaErrors,cardCount:doc.querySelectorAll('.auction-card').length,temporaryLinks:links.filter(x=>x?.includes('hostingersite.com')).slice(0,10),issues:[]}
 if(r.status===200){if(!row.title)row.issues.push('missing-title');if(!row.description)row.issues.push('missing-description');if(row.h1.length!==1)row.issues.push('h1-count');if(!row.canonical?.startsWith(origin))row.issues.push('wrong-canonical');if(/noindex/i.test(row.robots+' '+row.xRobots))row.issues.push('noindex');if(schemaErrors)row.issues.push('invalid-jsonld')}
 const unescaped=text.replace(/\\"/g,'"')
 const match=unescaped.match(/\{"enabled":(?:true|false),"hostname":"[^"]*","installation":"(?:direct|gtm)","gaId":"[^"]*","adsId":"[^"]*","adsLeadLabel":"[^"]*","gtmId":"[^"]*","pixelId":"[^"]*","clarityId":"[^"]*"\}/)
 if(match)report.integrationConfig=JSON.parse(match[0])
 report.pages.push(row);d.window.close();return links
}
for(const [name,fn] of [['nameservers',resolveNs],['mx',resolveMx],['txt',resolveTxt]])try{const value=await fn('koliotamerika.bg');report.dns[name]=name==='txt'?{googleVerification:value.some(v=>v.join('').startsWith('google-site-verification=')),spf:value.filter(v=>v.join('').startsWith('v=spf1')).map(v=>v.join(''))}:value}catch(e){report.dns[name]={error:e.code}}
for(const url of ['http://koliotamerika.bg/','https://www.koliotamerika.bg/','https://darkturquoise-duck-750266.hostingersite.com/'])try{const {r,text}=await get(url);report.redirects??=[];report.redirects.push({url,status:r.status,location:r.headers.get('location'),xRobots:r.headers.get('x-robots-tag'),metaRobots:text.match(/name="robots"[^>]*content="([^"]+)"/)?.[1]})}catch(e){report.errors.push({url,error:e.message})}
try{const {r,text}=await get(origin+'/robots.txt');report.robots={status:r.status,text}}catch(e){report.errors.push({path:'robots',error:e.message})}
let mainURLs=[]
for(const path of ['/sitemap.xml','/sitemap-index.xml',...['cars','cars-archive','powersports','powersports-archive'].map(x=>'/sitemap-auctions.xml?section='+x)])try{const {r,text,ms}=await get(origin+path);let urls=[];try{const d=new JSDOM(text,{contentType:'text/xml'});urls=[...d.window.document.querySelectorAll('loc')].map(x=>x.textContent);d.window.close()}catch{}
 report.sitemaps.push({path,status:r.status,ms,count:urls.length,wrongHost:urls.filter(x=>!x.startsWith(origin)),sample:urls.slice(0,2)})
 if(path==='/sitemap.xml')mainURLs=urls
}catch(e){report.errors.push({path,error:e.message})}
const paths=[...new Set(['/', '/blog','/kontakti','/kalkulator','/targove','/targove/motori-atv','/targove/arhiv','/targove/motori-atv/arhiv',...mainURLs.filter(x=>x.startsWith(origin+'/')).map(x=>new URL(x).pathname)])].slice(0,120)
let next=0,lotLinks=[]
await Promise.all(Array.from({length:3},async()=>{while(next<paths.length){const path=paths[next++];try{const links=await readPage(path);if(path==='/targove'||path==='/targove/arhiv')lotLinks.push(...links.filter(x=>x?.startsWith('/targove/kola?')).slice(0,2))}catch(e){report.errors.push({path,error:e.message})}}}))
for(const path of [...new Set(lotLinks)].slice(0,4))try{await readPage(path)}catch(e){report.errors.push({path,error:e.message})}
for(const field of ['title','description']){const m=new Map();for(const p of report.pages.filter(x=>x.status===200)){if(p[field])m.set(p[field],[...(m.get(p[field])||[]),p.path])}report['duplicate'+field]=[...m.values()].filter(x=>x.length>1)}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try{
 const context=await browser.newContext();const page=await context.newPage()
 let stage='before';const network=[],errors=[],failed=[]
 const tracking=url=>/googletagmanager\.com|google-analytics\.com|clarity\.ms|facebook\.net|facebook\.com\/tr|googleadservices\.com|doubleclick\.net/.test(url)
 const safe=url=>{const u=new URL(url);return {host:u.hostname,path:u.pathname,...(u.searchParams.has('id')?{id:u.searchParams.get('id')}:{}) ,...(u.searchParams.has('tid')?{tid:u.searchParams.get('tid')}:{})}}
 page.on('response',r=>{if(tracking(r.url()))network.push({stage,status:r.status(),...safe(r.url())})})
 page.on('requestfailed',r=>{if(tracking(r.url()))failed.push({stage,...safe(r.url()),error:r.failure()?.errorText})})
 page.on('pageerror',e=>errors.push(e.message.slice(0,220)))
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Приеми всички',exact:true}).waitFor({timeout:20000})
 await page.waitForTimeout(2500)
 const snap=async()=>({scripts:await page.locator('script[src]').evaluateAll(xs=>xs.map(x=>x.src).filter(x=>/googletagmanager|clarity|facebook|google-analytics/.test(x))),cookies:(await context.cookies()).map(x=>x.name),dataLayer:await page.evaluate(()=> (window.dataLayer||[]).map(x=>{if(x&&typeof x==='object'&&'0' in x)return {command:x[0],name:x[1],target:x[2]?.send_to};return {event:x?.event}})),})
 report.browser.before=await snap()
 stage='accepted';await page.getByRole('button',{name:'Приеми всички',exact:true}).click();await page.waitForTimeout(8000)
 report.browser.accepted=await snap()
 stage='blog';await page.goto(origin+'/blog',{waitUntil:'domcontentloaded'});await page.waitForTimeout(5000)
 report.browser.blog=await snap()
 report.browser.network=network;report.browser.failed=failed;report.browser.pageErrors=errors
 await context.close()
}catch(e){report.browser.error=e.message}finally{await browser.close()}
await mkdir('reports',{recursive:true});await writeFile('reports/live-eridan-audit.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({...report,pages:report.pages.map(p=>({path:p.path,status:p.status,robots:p.robots,xRobots:p.xRobots,canonical:p.canonical,lang:p.lang,cardCount:p.cardCount,schema:p.schema,issues:p.issues,temporaryLinks:p.temporaryLinks}))},null,2))
