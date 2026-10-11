import { mkdirSync, writeFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import snapshot from '../content/wordpress.json'
import home from '../content/homepage.json'
import revisions from '../content/content-review-2026-10.json'
import { reviewedHTML, type ContentRevision } from '../src/lib/content-review'
const urls = new Set<string>()
function collect(html:string) {
 const dom = new JSDOM(html)
 for(const a of dom.window.document.querySelectorAll('a[href]')){
  const href=a.getAttribute('href')!
  if(/^https?:\/\//.test(href)) urls.add(href)
 }
 dom.window.close()
}
for(const revision of revisions as ContentRevision[]){
 const original=snapshot.items.find(p=>p.slug===revision.slug)!
 collect(reviewedHTML(original.html,revision))
}
function strings(value:unknown){
 if(typeof value==='string' && value.includes('<a')) collect(value)
 else if(Array.isArray(value)) value.forEach(strings)
 else if(value && typeof value==='object') Object.values(value).forEach(strings)
}
strings(home)
const queue=[...urls], results: {url:string;status?:number;finalURL?:string;error?:string}[]=[]
await Promise.all(Array.from({length:4},async()=>{
 while(queue.length){
  const url=queue.shift()!
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Koliotamerika-Link-Check/1.0'},redirect:'follow'})
   await response.body?.cancel()
   results.push({url,status:response.status,finalURL:response.url})
  }catch(error){results.push({url,error:error instanceof Error?error.message:String(error)})}
 }
}))
mkdirSync('test-results',{recursive:true})
writeFileSync('test-results/external-links.json',JSON.stringify(results,null,2))
console.log('EXTERNAL_LINKS',JSON.stringify(results))
console.log('HTTP restrictions/timeouts require manual verification; they are not proof of broken links.')
