import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import { stable, contentReviewKey } from './content-review-upgrade'

export const galleryReviewKey='content:gallery:2026-10:v1'
export function galleryReviewUpdate(page: Pick<Page,'body'|'sections'>, previous: Page['body'], body: Page['body']): Partial<Page> {
 return previous && stable(page.body)===stable(previous) && !page.sections?.length ? {body} : {}
}
export async function upgradeGalleryReview(payload: Payload) {
 if((await payload.count({collection:'payload-kv',where:{key:{equals:galleryReviewKey}}})).totalDocs)return 0
 const editorConfig=await editorConfigFactory.default({config:payload.config})
 const body=convertHTMLToLexical({editorConfig,JSDOM,html:'<h2>Намери подобен автомобил</h2><p>Снимките показват автомобили от публикуваната ни галерия. Наличността, състоянието и разходите за всеки нов автомобил се проверяват отделно.</p><p>Разгледай <a href="/targove">актуалните автомобили на търг</a> или <a href="/kontakti">изпрати запитване за модела, който ти харесва</a>. Посочи и общия си бюджет, за да обсъдим възможностите.</p>'})
 const transactionID=await beginTransaction.call(payload.db)
 if(transactionID==null)throw new Error('Gallery review requires database transactions.')
 const req={transactionID}
 try{
  if((await payload.count({collection:'payload-kv',req,where:{key:{equals:galleryReviewKey}}})).totalDocs){await payload.db.commitTransaction(transactionID);return 0}
  const page=(await payload.find({collection:'pages',req,limit:1,depth:0,where:{slug:{equals:'koli-ot-amerika-galeriya'}}})).docs[0]
  const previous=(await payload.find({collection:'payload-kv',req,limit:1,depth:0,where:{key:{equals:contentReviewKey('koli-ot-amerika-galeriya')}}})).docs[0]?.data as {applied?:{body?:Page['body']}}|undefined
  if(!page||!previous?.applied?.body){await payload.db.commitTransaction(transactionID);return 0}
  const data=galleryReviewUpdate(page,previous.applied.body,body)
  if(data.body)await payload.update({collection:'pages',id:page.id,req,depth:0,data})
  await payload.create({collection:'payload-kv',req,data:{key:galleryReviewKey,data:{pageID:page.id,appliedAt:new Date().toISOString(),before:{body:page.body??null},applied:data,bodyPreserved:!data.body}}})
  await payload.db.commitTransaction(transactionID)
  return data.body?1:0
 }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
}
