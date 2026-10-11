import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { clarifyCopy } from './clarity-copy'
import { stable } from './content-review-upgrade'
export const clarityKey=(slug:string)=>'content:clarity:2026-10:v1:'+slug
export async function upgradeClarity(payload:Payload) {
 let updated=0
 const pages=(await payload.find({collection:'pages',pagination:false,depth:0})).docs
 for(const candidate of pages) {
  if(stable(clarifyCopy(candidate.body))===stable(candidate.body))continue
  const key=clarityKey(candidate.slug)
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null)throw new Error('Clarity updates require transactions.')
  const req={transactionID}
  try {
   if((await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs){await payload.db.commitTransaction(transactionID);continue}
   const page=await payload.findByID({collection:'pages',id:candidate.id,depth:0,req})
   const body=clarifyCopy(page.body)
   if(stable(body)!==stable(page.body)){
    await payload.update({collection:'pages',id:page.id,req,depth:0,data:{body}})
    await payload.create({collection:'payload-kv',req,data:{key,data:{pageID:page.id,before:{body:page.body},applied:{body},appliedAt:new Date().toISOString()}}})
    updated++
   }
   await payload.db.commitTransaction(transactionID)
  }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
 }
 // Do not replace an answer edited by the owner.
 const site=await payload.findGlobal({slug:'site-settings'})
 const old='Срокът зависи от местоположението на автомобила, транспортния график и документите. Ориентировъчен срок се уточнява за конкретната поръчка.'
 const faq=site.faq?.map(q=>q.answer===old?{...q,answer:'Срокът зависи от маршрута, документите и транспортния график. За автомобили от Калифорния, Сиатъл и други локации на Западното крайбрежие често е 3–4 месеца. Потвърждаваме ориентир за конкретната поръчка.'}:q)
 if(faq&&stable(faq)!==stable(site.faq))await payload.updateGlobal({slug:'site-settings',data:{faq}})
 return updated
}
