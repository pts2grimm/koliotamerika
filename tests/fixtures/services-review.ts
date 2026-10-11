import { clarifyCopy } from '../../src/lib/clarity-copy'
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import config from '../../src/payload.config'
import revisions from '../../content/services-review-2026-10.json'
import { servicesReviewKey } from '../../src/lib/services-review-key'
import { upgradeServicesReview } from '../../src/lib/services-review-upgrade'
import { stable } from '../../src/lib/content-review-upgrade'
import type { Page } from '../../src/payload-types'

const payload=await getPayload({config,disableOnInit:true})
type Journal={before:{body:Page['body'];sections:Page['sections'];intro:string;seo:Page['seo']};applied:{body?:Page['body']};bodyPreserved:boolean}
try {
 const journals=(await payload.find({collection:'payload-kv',limit:revisions.length,where:{key:{in:revisions.map(r=>servicesReviewKey(r.slug))}}})).docs
 assert.equal(journals.length,revisions.length)
 const editorConfig=await editorConfigFactory.fromFeatures({config:payload.config,features:({defaultFeatures})=>[...defaultFeatures,EXPERIMENTAL_TableFeature()]})
 for(const revision of revisions){
  const page=(await payload.find({collection:'pages',depth:0,limit:1,where:{slug:{equals:revision.slug}}})).docs[0]
  const journal=journals.find(row=>row.key===servicesReviewKey(revision.slug))!.data as Journal
  assert.equal(journal.bodyPreserved,false,revision.slug)
  const expected=convertHTMLToLexical({editorConfig,html:revision.html,JSDOM})
  assert.equal(stable(page.body),stable(clarifyCopy(expected)),revision.slug)
  assert.equal(page.intro,revision.intro,revision.slug)
  assert.equal(page.seo?.description,revision.seoDescription,revision.slug)
  assert.equal(page.title,revision.expectedTitle,revision.slug)
  assert.equal(page.seo?.title,revision.expectedSEOtitle,revision.slug)
  if(revision.slug==='uslugi')assert.equal(page.sections?.length??0,0,'Do not repeat old seed sections below the new directory')
 }
 assert.equal(await upgradeServicesReview(payload),0)
 // Exercise both a rich-text baseline and the seeded directory baseline.
 for(const slug of ['homologacia','uslugi']){
  const key=servicesReviewKey(slug)
  const journal=journals.find(row=>row.key===key)!.data as Journal
  const page=(await payload.find({collection:'pages',depth:0,limit:1,where:{slug:{equals:slug}}})).docs[0]
  await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
  const before=await payload.update({collection:'pages',id:page.id,depth:0,data:{...journal.before,status:'draft'}})
  const create=payload.create.bind(payload)
  payload.create=(async(args:Parameters<typeof payload.create>[0])=>{
   if(args.collection==='payload-kv')throw new Error('Injected service journal failure')
   return create(args)
  }) as typeof payload.create
  try{await assert.rejects(upgradeServicesReview(payload),/Injected service journal failure/)}finally{payload.create=create}
  assert.deepEqual(await payload.findByID({collection:'pages',id:page.id,depth:0}),before,'Journal failure rolls back body, sections and metadata')
  assert.equal(await upgradeServicesReview(payload),1)
  const after=await payload.findByID({collection:'pages',id:page.id,depth:0})
  for(const field of ['slug','title','kind','status','publishedAt','image','legacyImage','sourceURL'] as const)assert.deepEqual(after[field],before[field])
  assert.equal(after.seo?.title,before.seo?.title)
  assert.equal(await upgradeServicesReview(payload),0)
  await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
  const custom=convertHTMLToLexical({editorConfig,html:'<p>Ръчно променена услуга.</p>',JSDOM})
  const manual=await payload.update({collection:'pages',id:page.id,depth:0,data:{body:custom,sections:[{heading:'Моя секция',body:'Моята цена'}],intro:'Мое въведение',seo:{...after.seo,title:'Мое SEO',description:'Мое описание',noIndex:true}}})
  assert.equal(await upgradeServicesReview(payload),0)
  assert.deepEqual(await payload.findByID({collection:'pages',id:page.id,depth:0}),manual,'Manual body, section rows and SEO must survive')
  assert.equal(await upgradeServicesReview(payload),0)
 }
}finally{await payload.destroy()}
process.exit(0)
