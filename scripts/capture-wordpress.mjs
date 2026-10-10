import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { fetch, EnvHttpProxyAgent } from 'undici'
const dispatcher = new EnvHttpProxyAgent()
async function records(type) { const output=[]; for(let page=1;;page++){ const r=await fetch(`https://koliotamerika.bg/wp-json/wp/v2/${type}?per_page=100&page=${page}`,{dispatcher,signal:AbortSignal.timeout(30000)}); if(!r.ok)throw new Error(`WordPress ${type}: HTTP ${r.status}`); output.push(...await r.json()); if(page>=Number(r.headers.get('x-wp-totalpages')||1))break } return output }
const pages = await records('pages')
const posts = await records('posts')
const skip = new Set(['/', '/kontakti', '/blog', '/targove', '/targove/kola', '/blagodarim-vi'])
const allowed = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','B','EM','I','A','BR','BLOCKQUOTE','TABLE','THEAD','TBODY','TR','TH','TD'])
const output=[]
await mkdir('public/images/legacy', { recursive: true })
for (const item of [...pages, ...posts]) {
 const slug=new URL(item.link).pathname.replace(/^\/+|\/+$/g,''); if(skip.has('/'+slug))continue
 const dom = new JSDOM(item.content.rendered); const doc=dom.window.document
 doc.querySelectorAll('script,style,svg,noscript,form,iframe,button,input,select,textarea,.ccb-main-calc,.calc-container,[data-widget_type="shortcode.default"]').forEach(e=>e.remove())
 const paragraphs=[...doc.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(t=>t.length>60)
 const intro=(paragraphs[0] || new JSDOM(item.excerpt?.rendered || '').window.document.body.textContent || item.title.rendered).trim().slice(0,400)
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
 function clean(n){
  if(n.nodeType===3)return escape(n.textContent)
  if(n.nodeType!==1)return ''
  const children=[...n.childNodes].map(clean).join('')
  if(n.tagName==='H1')return `<h2>${children}</h2>`
  if(!allowed.has(n.tagName))return children
  let attrs=''
  if(n.tagName==='A') { const href=n.getAttribute('href')||''; try {const u=new URL(href,'https://koliotamerika.bg');if(['https:','http:','mailto:','tel:'].includes(u.protocol)){const target=u.hostname.endsWith('koliotamerika.bg')?u.pathname+u.search+u.hash:u.href;attrs=` href="${escape(target)}"`}}catch{} }
  return `<${n.tagName.toLowerCase()}${attrs}>${children}</${n.tagName.toLowerCase()}>`
 }
 let coverPath
 const remote = item.yoast_head_json?.og_image?.[0]?.url
 if(remote && new URL(remote).hostname==='koliotamerika.bg') {
  const ext=new URL(remote).pathname.split('.').pop().toLowerCase()
  if(['jpg','jpeg','png','webp'].includes(ext)) {
   try{const r=await fetch(remote,{dispatcher,signal:AbortSignal.timeout(20000)}); if(r.ok){const path=`/images/legacy/wp-${item.id}.${ext}`;await writeFile('public'+path,Buffer.from(await r.arrayBuffer()));coverPath=path}}catch{console.log('Image unavailable for post',item.id)}
  }
 }
 output.push({ sourceId:item.id,sourceURL:item.link,slug,title:new JSDOM(item.title.rendered).window.document.body.textContent,kind:item.type==='post'?'article':'page',intro,html:clean(doc.body),coverPath,seoTitle:item.yoast_head_json?.title,seoDescription:item.yoast_head_json?.description,date:item.date,modified:item.modified })
 console.log('Captured',slug)
}
await writeFile('content/wordpress.json',JSON.stringify({ capturedAt:new Date().toISOString(),source:'https://koliotamerika.bg',items:output },null,2))
console.log('Saved',output.length,'content records')
await dispatcher.close()
