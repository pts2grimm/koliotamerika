import { JSDOM } from 'jsdom'
import redirects from '../../content/legacy-redirects.json'

export type ContentRevision = {
 slug: string; title?: string; intro?: string; html?: string
 edits?: { match: string; html: string }[]
 related?: { href: string; label: string }[]
}
const localHosts = new Set(['koliotamerika.bg', 'www.koliotamerika.bg', 'papayawhip-ram-220810.hostingersite.com'])
const aliases: Record<string, string> = { ...redirects, '/za-nas': '/amerikanski-sajt-za-koli', '/poveritelnost': '/zashtita-na-lichni-danni', '/blagodarim-vi': '/kontakti' }
export function reviewedHref(href: string): string {
 if (href.startsWith('mailto:office@usimportauto.com')) return href.replace('office@usimportauto.com', 'office@koliotamerika.bg')
 if (/^https?:\/\//i.test(href)) {
  const url = new URL(href)
  if (localHosts.has(url.hostname)) href = url.pathname + url.search + url.hash
  else {
   if (['copart.com','www.copart.com','iaai.com','www.iaai.com'].includes(url.hostname)) {
    url.protocol = 'https:'
    url.hostname = url.hostname.replace(/^www\./, '')
    url.hostname = 'www.' + url.hostname
   }
   return url.href
  }
 }
 if (!href.startsWith('/') || href.startsWith('//')) return href
 const url = new URL(href, 'https://koliotamerika.bg')
 let path = url.pathname.replace(/\/+$/, '') || '/'
 if (path === '/vnos-na-koli-ot-usa' && url.hash === '#calc') { path = '/kalkulator'; url.hash = '' }
 const seen = new Set<string>()
 while (aliases[path] && !seen.has(path)) { seen.add(path); path = aliases[path] }
 if (url.hash === '#ceni') url.hash = ''
 return path + url.search + url.hash
}
const plain = (value: string) => value.replace(/\s+/g, ' ').trim()

/** Only used on the immutable WordPress baseline, never on an editor's HTML. */
export function reviewedHTML(original: string, revision: ContentRevision): string {
 const dom = new JSDOM('<!doctype html><body>' + (revision.html ?? original) + '</body>')
 const { document } = dom.window
 try {
  for (const edit of revision.edits || []) {
   const candidates = [...document.querySelectorAll('p,li,h2,h3,h4')].filter(node => plain(node.textContent || '').includes(edit.match))
   const nodes = candidates.filter(node => !candidates.some(other => other !== node && node.contains(other)))
   if (nodes.length !== 1) throw new Error('Content review match must be unique: ' + revision.slug + ': ' + edit.match + ' (' + nodes.length + ')')
   nodes[0].innerHTML = edit.html
  }
  for (const link of document.querySelectorAll('a')) {
   const label = plain(link.textContent || '')
   let href = reviewedHref(link.getAttribute('href') || '')
   if (href === '/' && /технотест|хомологаци|адаптаци/i.test(label)) href = '/homologacia'
   else if (href === '/' && /мотори|ATV|АТВ/i.test(label)) href = '/vnos-na-motori-ot-sasht'
   else if (href === '/' && /свърж|контакт/i.test(label)) href = '/kontakti'
   else if (href === '/' && /office@/i.test(label)) href = 'mailto:office@koliotamerika.bg'
   if (!href || (!label && !link.querySelector('img[alt]')) || (revision.slug === 'koli-ot-amerika-galeriya' && href === '/')) {
    link.replaceWith(...link.childNodes)
    continue
   }
   link.setAttribute('href', href)
   if (link.getAttribute('target') === '_blank') {
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean))
    rel.add('noopener'); rel.add('noreferrer')
    link.setAttribute('rel', [...rel].join(' '))
   }
  }
  // Correct the confirmed public contact without altering contractual clauses.
  const walker = document.createTreeWalker(document.body, dom.window.NodeFilter.SHOW_TEXT)
  let text: Node | null
  while ((text = walker.nextNode())) text.textContent = (text.textContent || '').replaceAll('office@usimportauto.com', 'office@koliotamerika.bg')
  if (revision.related?.length) {
   const heading = document.createElement('h2'); heading.textContent = 'Полезни следващи стъпки'
   const list = document.createElement('ul')
   for (const item of revision.related) {
    const li = document.createElement('li'), a = document.createElement('a')
    a.href = reviewedHref(item.href); a.textContent = item.label; li.append(a); list.append(li)
   }
   document.body.append(heading, list)
  }
  return document.body.innerHTML
 } finally { dom.window.close() }
}
