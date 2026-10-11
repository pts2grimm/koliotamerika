import assert from 'node:assert/strict'
import test from 'node:test'
import type { Page } from '../src/payload-types'
import revisions from '../content/page-seo-2026-10.json'
import { pageSEOUpdate } from '../src/lib/page-seo-upgrade'
import { cataloguePath, catalogueQuery } from '../src/lib/catalogue-query'
import { landingRelatedLinks, landingStructuredData } from '../src/lib/landing-seo'

test('legacy SEO updates preserve independently edited fields, images and noIndex', () => {
 const revision = revisions.find(p => p.slug === 'vnos-na-koli-ot-usa')!
 const page = { ...revision.before, id: 8, slug: revision.slug, seo: { ...revision.before.seo, title: 'Editor title', image: 99, noIndex: true }, title: 'Editor H1', status: 'draft' } as Page
 const data = pageSEOUpdate(page, revision)
 assert.equal(data.title, undefined)
 assert.equal(data.intro, revision.after.intro)
 assert.deepEqual(data.seo, { title: 'Editor title', description: revision.after.seo.description, image: 99, noIndex: true })
 assert.equal(data.status, undefined)
 assert.equal(data.body, undefined)
 assert.equal(data.slug, undefined)
 assert.equal(page.intro, revision.before.intro)
})
test('only exact seed sections are expanded; rich text and customized rows survive', () => {
 const revision = revisions.find(p => p.slug === 'uslugi')!
 const page = { ...revision.before, slug: revision.slug, sections: revision.before.sections!.map((s,i) => ({...s, id: 'row-'+i})) } as Page
 const data = pageSEOUpdate(page, revision)
 assert.equal(data.sections?.length, revision.after.sections!.length)
 assert.equal(data.sections?.[0].id, 'row-0')
 assert.equal(pageSEOUpdate({ ...page, sections: [{heading:'Custom', body:'Keep'}] }, revision).sections, undefined)
 assert.equal(pageSEOUpdate({ ...page, body: {root:{ children:[{type:'paragraph',version:1}],type:'root',version:1,direction:'ltr',format:'',indent:0}} }, revision).sections, undefined)
 for (const p of revisions) {
  assert.ok(p.after.seo.title.length <= 70)
  assert.ok(p.after.seo.description.length <= 180)
 }
})
test('catalogue rejects malformed pagination and canonicalizes only meaningful parameters', () => {
 for (const page of ['0','-1','1.5','1e2','10001','Infinity', ['1','2']]) assert.equal(catalogueQuery({page}).validPage, false)
 assert.equal(cataloguePath(catalogueQuery({page:'1',sort:'-createdAt',budget:'0',q:''})), '/avtomobili')
 assert.equal(cataloguePath(catalogueQuery({page:'2',utm_source:'test'})), '/avtomobili?page=2')
 assert.equal(catalogueQuery({budget:'Infinity'}).budget, 0)
 assert.equal(catalogueQuery({q:' BMW '}).filtered, true)
 assert.equal(catalogueQuery({sort:'price'}).filtered, true)
 assert.equal(catalogueQuery({page:'2'}).filtered, false)
 assert.equal(cataloguePath(catalogueQuery({q:'BMW',page:'2'}),1), '/avtomobili?q=BMW')
})
test('service markup reflects visible CMS copy and related links avoid self-links', () => {
 const data = landingStructuredData({slug:'homologacia',title:'Редактирана услуга',intro:'Редактирано описание'}, 'https://koliotamerika.bg', 'Коли от Америка')
 assert.equal(data['@graph'][0].mainEntity?.name, 'Редактирана услуга')
 assert.equal(data['@graph'][0].mainEntity?.description, 'Редактирано описание')
 assert.equal(data['@graph'][0].mainEntity?.url, 'https://koliotamerika.bg/homologacia')
 assert.equal(landingStructuredData({slug:'chesto-zadavani-vuprosi',title:'FAQ',intro:'Questions'},'https://example.test','Brand')['@graph'][0].mainEntity, undefined)
 for (const p of revisions) for (const link of landingRelatedLinks(p.slug)) { assert.ok(link.label); assert.notEqual(link.href, '/'+p.slug) }
})
