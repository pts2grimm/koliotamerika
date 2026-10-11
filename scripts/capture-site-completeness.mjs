import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
const origin='https://koliotamerika.bg'
async function get(url) {
 const data=execFileSync('curl',['-4','--fail','--location','--retry','2','--connect-timeout','15','--max-time','60','--silent','--show-error',url],{maxBuffer:20*1024*1024})
 return new Response(data)
}
async function api(kind) {
 const result=[]
 for(let page=1;page<20;page++){
  const r=await get(origin+'/wp-json/wp/v2/'+kind+'?per_page=100&page='+page)
  const batch=await r.json()
  result.push(...batch)
  if(batch.length<100)return result
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
const brands=new Map([...doc.querySelectorAll('.elementor-gallery-title[data-gallery-index]')].map(el=>[el.getAttribute('data-gallery-index'),el.textContent.trim()]))
const gallery=[...doc.querySelectorAll('.elementor-gallery-item[data-e-gallery-tags]')].map(el=>{
 const thumbnail=el.querySelector('[data-thumbnail]')
 const title=el.querySelector('.elementor-gallery-item__title')?.textContent.trim()
 const brand=brands.get(el.getAttribute('data-e-gallery-tags'))
 if(!thumbnail || !title || !brand) throw new Error('Unrecognized gallery item')
 return {title,brand,sourceURL:thumbnail.getAttribute('data-thumbnail')}
})
if(gallery.length!==41) throw new Error('Gallery count changed: review source before importing '+gallery.length)
gallery.sort((a,b)=>a.brand.localeCompare(b.brand)||a.title.localeCompare(b.title))
const contactHTML=await(await get(origin+'/kontakti/')).text()
const contacts=new JSDOM(contactHTML)
const contactLinks=[...new Set([...contacts.window.document.querySelectorAll('a[href]')].map(el=>el.getAttribute('href')).filter(x=>/^(tel:|mailto:|viber:)|whatsapp|viber\.com|facebook|maps/.test(x)))]
const report={capturedAt:new Date().toISOString(),source:origin,pages:pages.length,posts:posts.length,uncovered:records.filter(x=>!x.covered),contactLinks,records}
await mkdir('reports/site-completeness',{recursive:true})
await writeFile('reports/site-completeness/inventory.json',JSON.stringify(report,null,2)+'\n')
await writeFile('reports/site-completeness/gallery-source.html',galleryHTML)
const root=path.resolve('public'),sources=new Set(gallery.map(x=>x.sourceURL))
for(const record of records) for(const img of record.images) {
 if(img.src?.startsWith(origin+'/wp-content/uploads/'))sources.add(img.src)
 for(const part of (img.srcset||'').split(',')){
  const url=part.trim().split(/\s+/)[0]
  if(url.startsWith(origin+'/wp-content/uploads/'))sources.add(url)
 }
}
if(sources.size>500)throw new Error('Unexpected media count')
const media=[],unavailable=[]
let totalBytes=0
for(const sourceURL of [...sources].sort()) {
 const url=new URL(sourceURL),pathname=decodeURIComponent(url.pathname)
 if(url.origin!==origin || !pathname.startsWith('/wp-content/uploads/') || pathname.includes('\\') || pathname.split('/').some(x=>x==='..'||x==='.') || !/\.(jpe?g|png|webp)$/i.test(pathname))throw new Error('Unexpected media URL')
 const target=path.resolve(root,'.'+pathname)
 if(!target.startsWith(root+path.sep))throw new Error('Unexpected file path')
 try {
  let bytes
  try {bytes=await readFile(target)}catch(error){if(error.code!=='ENOENT')throw error;bytes=Buffer.from(await(await get(url.href)).arrayBuffer())}
  totalBytes+=bytes.length
  if(bytes.length>20*1024*1024 || totalBytes>200*1024*1024)throw new Error('Media size limit')
  const meta=await sharp(bytes).metadata()
  if(!['jpeg','png','webp'].includes(meta.format)||!meta.width||!meta.height)throw new Error('Invalid media')
  await mkdir(path.dirname(target),{recursive:true})
  try{await writeFile(target,bytes,{flag:'wx'})}catch(error){if(error.code!=='EEXIST')throw error}
  media.push({sourceURL,path:pathname,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:meta.width,height:meta.height})
 } catch(error){unavailable.push({sourceURL,error:error.message})}
}
for(const item of gallery){
 const file=media.find(x=>x.sourceURL===item.sourceURL)
 if(!file)throw new Error('Missing gallery photo: '+item.sourceURL)
 Object.assign(item,{src:file.path,width:file.width,height:file.height})
}
const examples={}
for(const slug of ['vnos-na-koli-ot-usa','homologacia','vnos-na-motori-ot-sasht','avtomobili-ot-amerikanski-aukcioni']){
 const selected=records.find(x=>x.path==='/'+slug).images.filter(x=>slug==='avtomobili-ot-amerikanski-aukcioni'||/ford-mustang|bmw-340ix|harley-davidson|sasth-indian/.test(x.src))
 examples[slug]=selected.map(x=>{
  const file=media.find(y=>y.sourceURL===x.src)
  if(!file)throw new Error('Missing example photo: '+x.src)
  return {src:file.path,width:file.width,height:file.height,alt:x.alt||'Автомобил от публикацията'}
 })
}
await writeFile('content/legacy-gallery.json',JSON.stringify({source:origin+'/koli-ot-amerika-galeriya/',capturedAt:report.capturedAt,items:gallery},null,2)+'\n')
await writeFile('content/legacy-examples.json',JSON.stringify(examples,null,2)+'\n')
await writeFile('content/legacy-media-extra.json',JSON.stringify({capturedAt:report.capturedAt,records:media,unavailable},null,2)+'\n')
console.log('MEDIA_RECOVERY',JSON.stringify({gallery:gallery.length,brands:brands.size-1,files:media.length,bytes:totalBytes,unavailable,examples:Object.fromEntries(Object.entries(examples).map(([k,v])=>[k,v.length]))}))
console.log('COMPLETENESS',JSON.stringify({pages:pages.length,posts:posts.length,uncovered:report.uncovered.map(x=>x.path),contactLinks,images:records.map(x=>({path:x.path,images:x.images.length,frames:x.frames})).filter(x=>x.images||x.frames.length)}))
dom.window.close();contacts.window.close()
