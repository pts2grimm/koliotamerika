import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import config from '../../src/payload.config'
import snapshot from '../../content/wordpress.json'
import revisions from '../../content/content-review-2026-10.json'
import { contentReviewKey, upgradeContentReview } from '../../src/lib/content-review-upgrade'
const payload = await getPayload({config,disableOnInit:true})
try {
 const count = await payload.count({collection:'payload-kv',where:{key:{like:'content:review:2026-10:v1:'}}})
 assert.equal(count.totalDocs,revisions.length)
 assert.equal(await upgradeContentReview(payload),0)
 const original = snapshot.items.find(item=>item.slug==='homologacia')!
 const page = (await payload.find({collection:'pages',where:{slug:{equals:original.slug}},depth:0,limit:1})).docs[0]
 const editorConfig = await editorConfigFactory.default({config:payload.config})
 const body = convertHTMLToLexical({editorConfig,html:original.html,JSDOM})
 const key = contentReviewKey(original.slug)
 await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
 const before = await payload.update({collection:'pages',id:page.id,depth:0,data:{body,status:'draft'}})
 assert.deepEqual(before.body, body, 'Stored Lexical baseline must compare to imported HTML')
 const create = payload.create.bind(payload)
 payload.create = (async (args: Parameters<typeof payload.create>[0])=>{
  if(args.collection==='payload-kv') throw new Error('Injected content audit failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradeContentReview(payload),/Injected content audit failure/)
 payload.create = create
 assert.deepEqual(await payload.findByID({collection:'pages',id:page.id,depth:0}),before)
 assert.equal(await upgradeContentReview(payload),1)
 const after = await payload.findByID({collection:'pages',id:page.id,depth:0})
 assert.notDeepEqual(after.body,body)
 for(const field of ['id','slug','status','publishedAt','legacyImage','sourceURL'] as const) assert.deepEqual(after[field],before[field])
 await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
 const custom = convertHTMLToLexical({editorConfig,html:'<p>Ръчна редакция, която трябва да остане.</p>',JSDOM})
 await payload.update({collection:'pages',id:page.id,data:{body:custom,title:'Ръчно заглавие',intro:'Ръчно въведение',seo:{title:'Ръчно SEO',description:'Ръчно описание'}}})
 await upgradeContentReview(payload)
 const edited = await payload.findByID({collection:'pages',id:page.id,depth:0})
 assert.deepEqual(edited.body,custom)
 assert.equal(edited.title,'Ръчно заглавие')
 assert.equal(edited.intro,'Ръчно въведение')
 assert.equal(edited.seo?.title,'Ръчно SEO')
 assert.equal(edited.seo?.description,'Ръчно описание')
 assert.equal(await upgradeContentReview(payload),0)
} finally { await payload.destroy() }
process.exit(0)
