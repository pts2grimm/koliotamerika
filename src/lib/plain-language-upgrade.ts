import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import additions from '../../content/plain-language-2026-10.json'
import { stable } from './content-review-upgrade'
import { pricingDetailsKey } from './pricing-details-key'

export const plainLanguageKey = (slug: string) => 'content:plain-language:2026-10:v1:' + slug

export async function upgradePlainLanguage(payload: Payload) {
 const applied = new Set((await payload.find({collection:'payload-kv',limit:additions.length,depth:0,select:{key:true},where:{key:{in:additions.map(item=>plainLanguageKey(item.slug))}}})).docs.map(item=>item.key))
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.fromFeatures>> | undefined
 let updated=0
 for(const addition of additions) {
  const key=plainLanguageKey(addition.slug)
  if(applied.has(key)) continue
  editorConfig ??= await editorConfigFactory.fromFeatures({config:payload.config,features:({defaultFeatures})=>[...defaultFeatures,EXPERIMENTAL_TableFeature()]})
  const body=convertHTMLToLexical({editorConfig,html:addition.html,JSDOM})
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null) throw new Error('Plain language updates require database transactions.')
  const req={transactionID}
  try {
   if((await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs) {await payload.db.commitTransaction(transactionID);continue}
   const previous=(await payload.find({collection:'payload-kv',req,depth:0,limit:1,where:{key:{equals:pricingDetailsKey(addition.slug)}}})).docs[0]?.data as {applied?:{body?:Page['body']}} | undefined
   const page=(await payload.find({collection:'pages',req,depth:0,limit:1,where:{slug:{equals:addition.slug}}})).docs[0]
   // Wait for the pricing review's baseline; never overwrite an unrecognized body.
   if(!page || !previous?.applied?.body) {await payload.db.commitTransaction(transactionID);continue}
   const bodyPreserved=stable(page.body)!==stable(previous.applied.body)
   if(!bodyPreserved) {await payload.update({collection:'pages',id:page.id,req,depth:0,data:{body}});updated++}
   await payload.create({collection:'payload-kv',req,data:{key,data:{pageID:page.id,appliedAt:new Date().toISOString(),before:{body:page.body ?? null},applied:bodyPreserved?{}:{body},bodyPreserved}}})
   await payload.db.commitTransaction(transactionID)
  } catch(error) {await payload.db.rollbackTransaction(transactionID);throw error}
 }
 return updated
}
