import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { restoreCleanTitlePublication, cleanTitlePublicationKey } from '../../src/lib/restore-clean-title-publication'
import drafts from '../../content/editorial-drafts.json'
import { publicPagesWhere } from '../../src/lib/page-access'
if (!process.env.DATABASE_URI?.startsWith('file:/tmp/koa-editorial-')) throw new Error('Isolated editorial test database required')
const payload = await getPayload({ config, disableOnInit: true })
const slug = 'clean-title-kola-ot-amerika'
const original = '2026-10-13T06:00:00.000Z'
const read = async () => (await payload.find({collection:'pages',where:{slug:{equals:slug}},depth:0,limit:1})).docs[0]
const unmark = () => payload.delete({collection:'payload-kv',where:{key:{equals:cleanTitlePublicationKey}}})
try {
 const page = await read()
 assert.equal(page.status,'published')
 assert.equal(new Date(page.publishedAt!).toISOString(),original)
 assert.equal((await payload.count({collection:'pages',where:{slug:{equals:slug}}})).totalDocs,1)
 assert.equal(page.title,drafts[0].title)
 assert.equal(page.intro,drafts[0].intro)
 assert.equal(page.seo?.title,drafts[0].seo.title)
 assert.ok(page.body)
 const baseline = JSON.stringify({title:page.title,intro:page.intro,body:page.body,seo:page.seo,image:page.image,legacyImage:page.legacyImage,sections:page.sections})
 await unmark()
 await payload.update({collection:'pages',id:page.id,data:{status:'published',publishedAt:'2026-10-20T06:00:00.000Z'}})
 const visible = async () => (await payload.find({collection:'pages',depth:0,where:{and:[{slug:{equals:slug}},publicPagesWhere(new Date('2026-10-14T12:00:00Z'))]}})).totalDocs
 assert.equal(await visible(),0)
 assert.equal(await restoreCleanTitlePublication(payload),true)
 assert.equal(await visible(),1)
 const restored = await read()
 assert.equal(restored.id,page.id)
 assert.equal(JSON.stringify({title:restored.title,intro:restored.intro,body:restored.body,seo:restored.seo,image:restored.image,legacyImage:restored.legacyImage,sections:restored.sections}),baseline)
 assert.equal(await restoreCleanTitlePublication(payload),false)
 // A later admin decision to take the article offline survives initialization.
 await payload.update({collection:'pages',id:page.id,data:{status:'draft'}})
 assert.equal(await restoreCleanTitlePublication(payload),false)
 assert.equal((await read()).status,'draft')
 // The old ApiCar app is unaffected, including unmarked imports.
 await unmark()
 await payload.update({collection:'pages',id:page.id,data:{status:'published',publishedAt:'2026-10-20T06:00:00.000Z'}})
 process.env.AUCTION_PROVIDER='apicar'
 assert.equal(await restoreCleanTitlePublication(payload),false)
 assert.equal(new Date((await read()).publishedAt!).toISOString(),'2026-10-20T06:00:00.000Z')
 process.env.AUCTION_PROVIDER='eridan'
 // A custom schedule is not overwritten.
 await payload.update({collection:'pages',id:page.id,data:{publishedAt:'2026-10-21T06:00:00.000Z'}})
 assert.equal(await restoreCleanTitlePublication(payload),false)
 assert.equal(new Date((await read()).publishedAt!).toISOString(),'2026-10-21T06:00:00.000Z')
 // A fresh draft is restored, without duplicate content.
 await unmark()
 await payload.update({collection:'pages',id:page.id,data:{status:'draft',publishedAt:null}})
 assert.equal(await restoreCleanTitlePublication(payload),true)
 for (const [other,date] of [['title-pending-copart-dokumenti','2026-10-16T06:00:00.000Z'],['proverka-servizni-akcii-vin-sasht','2026-10-23T06:00:00.000Z']]) {
  const entry=(await payload.find({collection:'pages',where:{slug:{equals:other}},limit:1})).docs[0]
  assert.equal(new Date(entry.publishedAt!).toISOString(),date)
 }
 console.log('PASS: original publication restored, content and ID preserved, no duplicates, other schedules intact, reruns and later admin edits preserved, ApiCar unchanged.')
} finally { await payload.destroy() }
process.exit(0)
