import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import revision from '../../content/homologation-review-2026-10.json'
import previous from '../../content/services-review-2026-10.json'
import { stable } from './content-review-upgrade'
import { homologationCopy, homologationText, retiredArticle } from './homologation-copy'
export const homologationKey=(scope:string)=>'content:homologation:2026-10-20:v1:'+scope
const pageFields=['title','intro','eyebrow','body','sections','seo','legacyImage'] as const
export function homologationPageUpdate(page:Page, baseline:Page['body'], replacement:Page['body']):Partial<Page>{
 const data:Partial<Page>={}
 for(const field of pageFields){
  if(page[field]===undefined)continue
  const next=homologationCopy(page[field])
  if(stable(next)!==stable(page[field]))Object.assign(data,{[field]:next})
 }
 if(page.slug==='homologacia'){
  // Replace the reviewed baseline only; preserve later custom sections/body.
  if(stable(page.body)===stable(baseline)&&!page.sections?.length)data.body=replacement
  const old=previous.find(item=>item.slug==='homologacia')!
  if(page.title===old.expectedTitle)data.title=revision.title
  if(page.intro===old.intro)data.intro=revision.intro
  const seo={...page.seo,...data.seo}
  if(seo.title===old.expectedSEOtitle)seo.title=revision.seo.title
  if(seo.description===old.seoDescription)seo.description=revision.seo.description
  if(stable(seo)!==stable(page.seo))data.seo=seo
 }
 if(page.slug===retiredArticle){
  data.status='draft'
  data.title='Подготовка за индивидуално одобряване — архив'
  data.intro='Съдържанието е обединено с актуалната услуга за хомологация.'
  data.seo={...page.seo,...data.seo,title:data.title,description:data.intro}
 }
 if(data.seo)data.seo={...data.seo,title:data.seo.title?.slice(0,70),description:data.seo.description?.slice(0,180)}
 return data
}
export async function upgradeHomologation(payload:Payload){
 const completedKey=homologationKey('complete')
 if((await payload.count({collection:'payload-kv',where:{key:{equals:completedKey}}})).totalDocs)return 0
 const pages=(await payload.find({collection:'pages',pagination:false,limit:0,depth:0})).docs
 const editorConfig=await editorConfigFactory.fromFeatures({config:payload.config,features:({defaultFeatures})=>[...defaultFeatures,EXPERIMENTAL_TableFeature()]})
 const baseline=convertHTMLToLexical({editorConfig,html:previous.find(item=>item.slug==='homologacia')!.html,JSDOM})
 const replacement=convertHTMLToLexical({editorConfig,html:revision.html,JSDOM})
 let updated=0
 for(const candidate of pages){
  const key=homologationKey('page:'+candidate.id)
  if((await payload.count({collection:'payload-kv',where:{key:{equals:key}}})).totalDocs)continue
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null)throw new Error('Homologation update requires transactions.')
  const req={transactionID}
  try{
   if((await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs){await payload.db.commitTransaction(transactionID);continue}
   const page=await payload.findByID({collection:'pages',id:candidate.id,depth:0,req})
   const data=homologationPageUpdate(page,baseline,replacement)
   if(Object.keys(data).length){
    await payload.update({collection:'pages',id:page.id,req,depth:0,data})
    await payload.create({collection:'payload-kv',req,data:{key,data:{
     pageID:page.id,appliedAt:new Date().toISOString(),
     before:Object.fromEntries(Object.keys(data).map(field=>[field,page[field as keyof Page]??null])),
     applied:data,
    }}})
    updated++
   }
   await payload.db.commitTransaction(transactionID)
  }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
 }
 const media=(await payload.find({collection:'media',pagination:false,limit:0,depth:0})).docs
 for(const item of media){
  const alt=homologationText(item.alt)
  if(alt===item.alt)continue
  const key=homologationKey('media:'+item.id)
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null)throw new Error('Homologation media update requires transactions.')
  const req={transactionID}
  try{
   if(!(await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs){
    const fresh=await payload.findByID({collection:'media',id:item.id,req})
    const updatedAlt=homologationText(fresh.alt)
    await payload.update({collection:'media',id:item.id,req,data:{alt:updatedAlt}})
    await payload.create({collection:'payload-kv',req,data:{key,data:{before:{alt:fresh.alt},applied:{alt:updatedAlt},appliedAt:new Date().toISOString()}}})
   }
   await payload.db.commitTransaction(transactionID)
  }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
 }
 const key=homologationKey('site-settings')
 if(!(await payload.count({collection:'payload-kv',where:{key:{equals:key}}})).totalDocs){
  const transactionID=await beginTransaction.call(payload.db)
  if(transactionID==null)throw new Error('Homologation settings update requires transactions.')
  const req={transactionID}
  try{
   if(!(await payload.count({collection:'payload-kv',req,where:{key:{equals:key}}})).totalDocs){
    const site=await payload.findGlobal({slug:'site-settings',req})
    const before={heroTitle:site.heroTitle,heroDescription:site.heroDescription,defaultDescription:site.defaultDescription,faq:site.faq}
    const data=homologationCopy(before)
    if(stable(before)!==stable(data))await payload.updateGlobal({slug:'site-settings',req,data})
    await payload.create({collection:'payload-kv',req,data:{key,data:{before,applied:data,appliedAt:new Date().toISOString()}}})
   }
   await payload.db.commitTransaction(transactionID)
  }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
 }
 const transactionID=await beginTransaction.call(payload.db)
 if(transactionID==null)throw new Error('Homologation completion requires transactions.')
 const req={transactionID}
 try{
  if(!(await payload.count({collection:'payload-kv',req,where:{key:{equals:completedKey}}})).totalDocs)await payload.create({collection:'payload-kv',req,data:{key:completedKey,data:{appliedAt:new Date().toISOString(),updated}}})
  await payload.db.commitTransaction(transactionID)
 }catch(error){await payload.db.rollbackTransaction(transactionID);throw error}
 return updated
}
