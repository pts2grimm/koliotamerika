import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
const origin='https://koliotamerika.bg'
async function get(url) {
 const r=await fetch(url,{signal:AbortSignal.timeout(40000)})
 if(!r.ok)throw new Error(url+' HTTP '+r.status)
 return r
}
async function api(kind) {
 const result=[]
 for(let page=1;page<20;page++){
  const r=await get(origin+'/wp-json/wp/v2/'+kind+'?per_page=100&page='+page)
  result.push(...await r.json())
  if(page>=Number(r.headers.get('x-wp-totalpages')))return result
 }
 throw new Error('Pagination limit')
}
const [pages,posts]=await Promise.all([api('pages'),api('posts')])
const snapshot=JSON.parse(await readFile('content/wordpress.json','utf8'))
const imported=new Set(snapshot.items.map(x=>'/'+x.slug))
const special=new Set(['/','/kontakti','/blog','/targove','/targove/kola','/blagodarim-vi'])
const records=[]
for(const item of [...pages,...posts]){
 const pathname=new URL(item.link).pathname.replace(/\/$/,'')||'/'
 const dom=new JSDOM(item.content.rendered),doc=dom.window.document
 records.push({id:item.id,path:pathname,title:item.title.rendered,modified:item.modified,covered:imported.has(pathname)||special.has(pathname),
  images:[...doc.querySelectorAll('img')].map(el=>({src:el.getAttribute('src'),srcset:el.getAttribute('srcset'),alt:el.getAttribute('alt')})),
  frames:[...doc.querySelectorAll('iframe')].map(el=>el.getAttribute('src')),
  links:[...new Set([...doc.querySelectorAll('a[href]')].map(el=>el.getAttribute('href')))]})
 dom.window.close()
}
const galleryHTML=await(await get(origin+'/koli-ot-amerika-galeriya/')).text()
const dom=new JSDOM(galleryHTML),doc=dom.window.document
const interesting=[...doc.querySelectorAll('img')].filter(el=>el.outerHTML.includes('2023/05') || /350z|avalo|roadster|m5/i.test(el.outerHTML))
console.log('GALLERY_STRUCTURE',JSON.stringify(interesting.slice(0,3).map(el=>el.parentElement?.parentElement?.outerHTML.slice(0,7000))))
console.log('GALLERY_WIDGETS',JSON.stringify([...doc.querySelectorAll('[data-widget_type]')].map(el=>({type:el.getAttribute('data-widget_type'),settings:el.getAttribute('data-settings')?.slice(0,300)}))))
const contactHTML=await(await get(origin+'/kontakti/')).text()
const contacts=new JSDOM(contactHTML)
const contactLinks=[...new Set([...contacts.window.document.querySelectorAll('a[href]')].map(el=>el.getAttribute('href')).filter(x=>/^(tel:|mailto:|viber:)|whatsapp|viber\.com|facebook|maps/.test(x)))]
const report={capturedAt:new Date().toISOString(),source:origin,pages:pages.length,posts:posts.length,uncovered:records.filter(x=>!x.covered),contactLinks,records}
await mkdir('reports/site-completeness',{recursive:true})
await writeFile('reports/site-completeness/inventory.json',JSON.stringify(report,null,2)+'\n')
await writeFile('reports/site-completeness/gallery-source.html',galleryHTML)
console.log('COMPLETENESS',JSON.stringify({pages:pages.length,posts:posts.length,uncovered:report.uncovered.map(x=>x.path),contactLinks,images:records.map(x=>({path:x.path,images:x.images.length,frames:x.frames})).filter(x=>x.images||x.frames.length)}))
dom.window.close();contacts.window.close()
