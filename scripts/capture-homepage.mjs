// Capture the public homepage once. No WordPress requests are made at site runtime.
import { readFile, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { fetch, EnvHttpProxyAgent } from 'undici'
const source = 'https://koliotamerika.bg/'
let html
if (process.argv[2]) html = await readFile(process.argv[2], 'utf8')
else {
 const dispatcher = new EnvHttpProxyAgent()
 try { const response = await fetch(source, { dispatcher, signal: AbortSignal.timeout(30000) }); if (!response.ok) throw new Error(`Homepage HTTP ${response.status}`); html = await response.text() } finally { await dispatcher.close() }
}
const doc = new JSDOM(html).window.document
const text = node => node?.textContent.replace(/\s+/g, ' ').replace(/\u200b/g, '').trim() || ''
const widget = id => { const el = doc.querySelector(`[data-id="${id}"]`); if (!el) throw new Error(`Missing homepage widget ${id}`); return el }
const redirects = { '/tehnotest': '/homologacia', '/polezna-informaciq': '/aukcioni-za-koli-v-amerika', '/polezna-informaciq/vnos-na-koli-ot-amerika': '/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena', '/aukcioni-za-koli-v-amerika/vnos-na-koli-ot-amerika': '/vnos-na-koli-ot-usa' }
function href(value) {
 const url = new URL(value, source)
 if (!['https:', 'http:'].includes(url.protocol)) return ''
 if (url.hostname === 'koliotamerika.bg') { const path = url.pathname.replace(/\/$/, '') || '/'; return (redirects[path] || path) + url.search + url.hash }
 return url.href
}
const escape = str => str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const allowed = new Set(['P', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'BR', 'A', 'H2', 'H3'])
function clean(node) {
 if (node.nodeType === 3) return escape(node.textContent)
 if (node.nodeType !== 1 || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].includes(node.tagName)) return ''
 const content = [...node.childNodes].map(clean).join('')
 if (!allowed.has(node.tagName)) return content
 const tag = node.tagName.toLowerCase()
 if (tag === 'br') return '<br>'
 const link = tag === 'a' && node.getAttribute('href') ? href(node.getAttribute('href')) : ''
 return `<${tag}${link ? ` href="${escape(link)}"` : ''}>${content}</${tag}>`
}
const content = id => clean(widget(id))
const section = (heading, body) => ({ heading: text(widget(heading)), html: content(body) })
const result = {
 source, capturedAt: new Date().toISOString(),
 intro: section('6fc698c', '77f41d3'), catalogue: content('ff42f87'),
 services: { ...section('f262601', '1cbc12b'), intro: text(widget('fa4a8b0')) },
 benefits: { heading: text(widget('e38b028')), items: ['f72c0f2', 'ad88a02', '33c94c8', 'ad728a7'].map(id => { const w = widget(id); return { title: text(w.querySelector('.elementor-image-box-title')), text: text(w.querySelector('.elementor-image-box-description')) } }) },
 viber: { ...section('8e35c54', 'c537d7d'), url: doc.querySelector('a[href^="https://invite.viber.com/"]').href },
 consultation: { heading: text(widget('244988b').querySelector('.elementor-image-box-title')), text: text(widget('244988b').querySelector('.elementor-image-box-description')) },
 reasons: [section('22b6d96', '1e5305b'), section('264cd4c', '25e5bf2')],
 faq: [...doc.querySelectorAll('.elementor-accordion-item')].map(el => ({ question: text(el.querySelector('.elementor-accordion-title')), html: clean(el.querySelector('.elementor-tab-content')), text: text(el.querySelector('.elementor-tab-content')) })), faqMore: content('101939a'),
 testimonials: { heading: text(widget('39c7294')), items: [...doc.querySelectorAll('.elementor-testimonial')].map(el => ({ quote: text(el.querySelector('.elementor-testimonial__text')), name: text(el.querySelector('.elementor-testimonial__name')), car: text(el.querySelector('.elementor-testimonial__title')) })) },
 partners: { heading: text(widget('482bf9d')), names: ['Copart', 'IAAI', 'Carfax', 'AutoCheck', 'Atlantic Export'] },
 news: { heading: text(widget('d9f3e28')), items: [...doc.querySelectorAll('.elementor-post')].map(el => ({ title: text(el.querySelector('.elementor-post__title')), href: href(el.querySelector('.elementor-post__title a').href), excerpt: text(el.querySelector('.elementor-post__excerpt')) })) },
}
if (result.faq.length !== 4 || result.testimonials.items.length !== 3 || result.news.items.length !== 3) throw new Error('Unexpected homepage structure; review capture selectors.')
await writeFile('content/homepage.json', JSON.stringify(result, null, 2) + '\n')
console.log('Captured all homepage text sections, 4 questions, 3 testimonials and 3 news links.')
