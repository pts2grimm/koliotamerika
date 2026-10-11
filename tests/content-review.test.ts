import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import snapshot from '../content/wordpress.json'
import revisions from '../content/content-review-2026-10.json'
import { reviewedHTML, reviewedHref, type ContentRevision } from '../src/lib/content-review'
import { contentReviewUpdate } from '../src/lib/content-review-upgrade'
import type { Page } from '../src/payload-types'

test('review covers every imported article/page without changing the archival snapshot', () => {
 assert.deepEqual(revisions.map(p => p.slug).sort(), snapshot.items.map(p => p.slug).sort())
})
for (const revision of revisions as ContentRevision[]) test('review applies exact edits and normalizes links: ' + revision.slug, () => {
 const original = snapshot.items.find(p => p.slug === revision.slug)!
 const html = reviewedHTML(original.html, revision)
 const dom = new JSDOM(html)
 try {
  assert.ok(dom.window.document.body.textContent!.trim().length > 200)
  assert.equal(dom.window.document.querySelectorAll('h1').length, 0)
  for (const a of dom.window.document.querySelectorAll('a')) {
   const href = a.getAttribute('href')!
   assert.equal(reviewedHref(href), href)
   if (/калкулатор/i.test(a.textContent || '')) assert.equal(href, '/kalkulator')
   assert.ok(a.textContent?.trim() || a.querySelector('img[alt]'), 'empty link: ' + href)
   assert.doesNotMatch(href, /usimportauto|^http:\/\/(?:www\.)?(?:copart|iaai)/)
  }
 } finally { dom.window.close() }
})
test('URL cleanup preserves external destinations, query strings and valid fragments', () => {
 assert.equal(reviewedHref('https://koliotamerika.bg/tehnotest/'), '/homologacia')
 assert.equal(reviewedHref('/vnos-na-koli-ot-usa/#calc'), '/kalkulator')
 assert.equal(reviewedHref('/polezna-informaciq/?x=1#topic-2'), '/aukcioni-za-koli-v-amerika?x=1#topic-2')
 assert.equal(reviewedHref('https://other.test/a?x=1#keep'), 'https://other.test/a?x=1#keep')
 assert.equal(reviewedHref('tel:+359888292280'), 'tel:+359888292280')
})
test('review preserves editorial body, metadata overrides, draft status, URL and media', () => {
 const body = { root: { type:'root', version:1, direction:null, format:'', indent:0, children:[] } } as NonNullable<Page['body']>
 const page = {id:7, title:'Editor',intro:'Editor introduction',body,seo:{title:'Editor SEO',description:'Editor description',image:9,noIndex:true},slug:'homologacia',status:'draft'} as Page
 const baseline = {title:'Original',intro:'Original intro',seoTitle:'Original SEO',seoDescription:'Original description',body:{...body,root:{...body.root,children:[{type:'paragraph',version:1}]}}}
 const revision = {slug:page.slug,title:'Reviewed',intro:'Reviewed intro'}
 assert.deepEqual(contentReviewUpdate(page,baseline,revision,baseline.body), {})
 const untouched = {...page,title:baseline.title,intro:baseline.intro,body:baseline.body,seo:{title:baseline.seoTitle,description:baseline.seoDescription,image:9,noIndex:true}}
 const update = contentReviewUpdate(untouched,baseline,revision,body)
 assert.deepEqual(update.body, body)
 assert.equal(update.seo?.image,9)
 assert.equal(update.seo?.noIndex,true)
 for(const key of ['slug','status','publishedAt','image','legacyImage']) assert.equal(update[key as keyof Page],undefined)
})

test('undefined Lexical list fields are equivalent to the persisted JSON baseline', () => {
 const root = {type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'listitem',version:1,checked:undefined,children:[]}]}
 const baseline = {title:'Original',intro:'Original',seoTitle:'Original',seoDescription:'Original',body:{root}} as Parameters<typeof contentReviewUpdate>[1]
 const page = {...baseline,body:JSON.parse(JSON.stringify(baseline.body)),slug:'test',seo:{title:'Original',description:'Original'}} as unknown as Page
 const reviewed = {...baseline.body,root:{...root,children:[]}} as Page['body']
 assert.deepEqual(contentReviewUpdate(page,baseline,{slug:'test'},reviewed).body,reviewed)
})

test('generated link IDs do not hide genuine URL or relationship edits', () => {
 const makeBody=(id:string,url:string)=>({root:{type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'link',version:1,id,fields:{url},children:[]}]}}) as Page['body']
 const baseline={title:'Original',intro:'Original',seoTitle:'',seoDescription:'',body:makeBody('import-id','/kontakti')}
 const page={...baseline,body:makeBody('stored-id','/kontakti'),seo:{}} as unknown as Page
 const replacement=makeBody('new-id','/kalkulator')
 assert.deepEqual(contentReviewUpdate(page,baseline,{slug:'test'},replacement).body,replacement)
 assert.equal(contentReviewUpdate({...page,body:makeBody('stored-id','/uslugi')},baseline,{slug:'test'},replacement).body,undefined)
})
