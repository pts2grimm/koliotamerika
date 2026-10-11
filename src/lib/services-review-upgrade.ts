import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import revisions from '../../content/services-review-2026-10.json'
import { stable } from './content-review-upgrade'
import { contentReviewKey } from './content-review-key'
import { pricingDetailsKey } from './pricing-details-key'
import { pageSEOKey } from './page-seo-upgrade'
import { servicesReviewKey } from './services-review-key'

type Revision = typeof revisions[number]
type Prior = { applied?: { body?: Page['body']; sections?: Page['sections'] } }
const sections = (value: Page['sections']) => value?.map(({heading,body})=>({heading,body})) || []
export function servicesReviewUpdate(page: Page, prior: Prior, revision: Revision, body: Page['body']): Partial<Page> {
 const data: Partial<Page> = {}
 // Imported pages use their last committed body as baseline. The seeded service
 // directory uses its prior section rows, and must not have acquired a rich body.
 const untouched = revision.baseline === 'seo'
  ? !!prior.applied?.sections && !page.body?.root.children.length && stable(sections(page.sections)) === stable(sections(prior.applied.sections))
  : !!prior.applied?.body && stable(page.body) === stable(prior.applied.body) && !page.sections?.length
 if (untouched) {
  data.body = body
  if (revision.baseline === 'seo') data.sections = []
 }
 // Guard each editorial field independently; keep custom titles, SEO images,
 // indexing controls, dates, status and media untouched.
 if(page.intro === revision.beforeIntro) data.intro = revision.intro
 if(page.seo?.description === revision.beforeSEODescription) data.seo = {...page.seo,description:revision.seoDescription}
 return data
}

export async function upgradeServicesReview(payload: Payload) {
 const keys = revisions.map(item=>servicesReviewKey(item.slug))
 const applied = new Set((await payload.find({collection:'payload-kv',limit:keys.length,depth:0,select:{key:true},where:{key:{in:keys}}})).docs.map(item=>item.key))
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.fromFeatures>> | undefined
 let updated=0
 for(const revision of revisions) {
  const key=servicesReviewKey(revision.slug)
  if(applied.has(key)) continue
  editorConfig ??= await editorConfigFactory.fromFeatures({config:payload.config,features:({defaultFeatures})=>[...defaultFeatures,EXPERIMENTAL_TableFeature()]})
  const body=convertHTMLToLexical({editorConfig,html:revision.html,JSDOM})
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null) throw new Error('Services review requires database transactions.')
  const req={transactionID}
  try {
   if((await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs) {await payload.db.commitTransaction(transactionID);continue}
   const previousKey=revision.baseline==='pricing'?pricingDetailsKey(revision.slug):revision.baseline==='seo'?pageSEOKey(revision.slug):contentReviewKey(revision.slug)
   const prior=(await payload.find({collection:'payload-kv',req,depth:0,limit:1,where:{key:{equals:previousKey}}})).docs[0]?.data as Prior | undefined
   const page=(await payload.find({collection:'pages',req,depth:0,limit:1,where:{slug:{equals:revision.slug}}})).docs[0]
   if(!page || !prior) {await payload.db.commitTransaction(transactionID);continue}
   const data=servicesReviewUpdate(page,prior,revision,body)
   if(Object.keys(data).length) {await payload.update({collection:'pages',id:page.id,req,depth:0,data});updated++}
   await payload.create({collection:'payload-kv',req,data:{key,data:{pageID:page.id,appliedAt:new Date().toISOString(),before:{body:page.body??null,sections:page.sections??null,intro:page.intro,seo:page.seo??null},applied:data,bodyPreserved:!('body' in data)}}})
   await payload.db.commitTransaction(transactionID)
  } catch(error) {await payload.db.rollbackTransaction(transactionID);throw error}
 }
 return updated
}
