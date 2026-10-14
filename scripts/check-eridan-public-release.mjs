import { writeFile } from 'node:fs/promises'
const hosts=['https://koliotamerika.bg','https://darkturquoise-duck-750266.hostingersite.com']
const routes=['/','/blog','/targove','/targove/motori-atv','/kontakti','/robots.txt','/sitemap.xml']
const checks=[]
for(const host of hosts){
 for(const path of routes){
  if(host===hosts[0]&&path==='/targove/motori-atv')continue
  const start=Date.now()
  try{
   const response=await fetch(host+path,{signal:AbortSignal.timeout(30000)})
   const body=await response.text()
   const isHtml=(response.headers.get('content-type')||'').includes('text/html')
   checks.push({host,path,status:response.status,ms:Date.now()-start,
    xRobots:response.headers.get('x-robots-tag'),
    ...(isHtml?{title:body.match(/<title>([^<]*)<\/title>/)?.[1],h1:(body.match(/<h1\b/g)||[]).length,canonical:body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1]}:{}),
    ...(path==='/robots.txt'?{blocksAll:/Disallow:\s*\/\s*(?:\r?\n|$)/.test(body),hasSitemap:body.includes('Sitemap:')}:{}),
    ...(path==='/sitemap.xml'?{urls:(body.match(/<loc>/g)||[]).length,hasStagingURLs:body.includes('hostingersite.com')}:{}),
    ...(path==='/blog'?{editorialSlugs:['clean-title-kola-ot-amerika','proverka-servizni-akcii-vin-sasht','title-pending-copart-dokumenti'].filter(slug=>body.includes('href="/'+slug+'"'))}:{}),
   })
  }catch{checks.push({host,path,error:'unreachable-or-timeout',ms:Date.now()-start})}
 }
}
await writeFile('public-release-check.json',JSON.stringify(checks,null,2))
for(const check of checks)console.log('PUBLIC_RELEASE',JSON.stringify(check))
if(checks.some(check=>check.error||check.status!==200))process.exitCode=1
