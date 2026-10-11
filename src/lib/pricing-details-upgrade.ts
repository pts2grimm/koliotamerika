import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import snapshot from '../../content/wordpress.json'
import revisions from '../../content/content-review-2026-10.json'
import additions from '../../content/pricing-details-2026-10.json'
import { reviewedHTML, type ContentRevision } from './content-review'
import { contentReviewKey, stable } from './content-review-upgrade'
import { pricingDetailsKey } from './pricing-details-key'

export async function upgradePricingDetails(payload: Payload) {
 const applied = new Set((await payload.find({collection:'payload-kv',limit:additions.length,depth:0,select:{key:true},where:{key:{in:additions.map(item=>pricingDetailsKey(item.slug))}}})).docs.map(item=>item.key))
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.fromFeatures>> | undefined
 let updated=0
 for(const addition of additions) {
  const key=pricingDetailsKey(addition.slug)
  if(applied.has(key)) continue
  const original=snapshot.items.find(item=>item.slug===addition.slug)!
  const revision=revisions.find(item=>item.slug===addition.slug)! as ContentRevision
  editorConfig ??= await editorConfigFactory.fromFeatures({config:payload.config,features:({defaultFeatures})=>[...defaultFeatures,EXPERIMENTAL_TableFeature()]})
  const reviewed=reviewedHTML(original.html,revision)
   .replaceAll('https://www.copart.com/content/us/en/member-fees-us-licensed','https://www.copart.com/content/us/en/member-fees-us-non-licensed')
   .replaceAll('официалната тарифа на Copart за лицензирани купувачи','публичната тарифа на Copart за купувачи без лиценз')
  const body=convertHTMLToLexical({editorConfig,html:reviewed+addition.html,JSDOM})
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null) throw new Error('Pricing details require database transactions.')
  const req={transactionID}
  try {
   if((await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs) {await payload.db.commitTransaction(transactionID);continue}
   const previous=(await payload.find({collection:'payload-kv',req,depth:0,limit:1,where:{key:{equals:contentReviewKey(addition.slug)}}})).docs[0]?.data as {applied?:{body?:Page['body']}} | undefined
   const page=(await payload.find({collection:'pages',req,depth:0,limit:1,where:{slug:{equals:addition.slug}}})).docs[0]
   // Wait for the first review's baseline; never overwrite an unrecognized body.
   if(!page || !previous?.applied?.body) {await payload.db.commitTransaction(transactionID);continue}
   const bodyPreserved=stable(page.body)!==stable(previous.applied.body)
   if(!bodyPreserved) {await payload.update({collection:'pages',id:page.id,req,depth:0,data:{body}});updated++}
   await payload.create({collection:'payload-kv',req,data:{key,data:{pageID:page.id,appliedAt:new Date().toISOString(),before:{body:page.body ?? null},applied:bodyPreserved?{}:{body},bodyPreserved}}})
   await payload.db.commitTransaction(transactionID)
  } catch(error) {await payload.db.rollbackTransaction(transactionID);throw error}
 }
 return updated
}
