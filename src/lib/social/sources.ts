import type { Payload } from 'payload'
import { database } from '../database'
import { q, insertDraft } from './store'
import { SocialError, siteLink, sourceKey, vehicleLink, text, nextSlots } from './validation'
import type { SocialPost, SocialSettings } from './types'
import { vehiclePostMessage } from './vehicle-message'
export const starterTips=[
 {title:'Проверка преди наддаване',message:'Преди да наддаваш, съпостави VIN в обявата и документите. Прегледай снимките и наличната история, уточни вида на документа и дали има ключ. Снимките сами по себе си не са техническа проверка.',link:'https://koliotamerika.bg/blog/'},
 {title:'Планиране на бюджета',message:'Планирай общия бюджет преди търга: покупка, приложими такси, транспорт, ремонт и процедурата за регистрация. Поискай конкретна разбивка за избрания автомобил — крайната оферта зависи от него и маршрута.',link:'https://koliotamerika.bg/kalkulator'},
 {title:'Мястото за получаване',message:'Преди да организираш превоз, потвърди реалното място за получаване на автомобила, кога може да бъде освободен и условията за товарене. Съгласувай тези данни с превозвача.',link:'https://koliotamerika.bg/kontakti'},
]
export async function articleOptions(payload:Payload){
 const result=await payload.find({collection:'pages',where:{kind:{equals:'article'}},sort:'-publishedAt',limit:40,depth:0,pagination:false,overrideAccess:false,user:null,select:{title:true,slug:true,intro:true}})
 return result.docs.map(p=>({title:p.title,slug:p.slug,intro:p.intro||''}))
}
export async function makeDraft(payload:Payload,kind:unknown,source:unknown,message?:unknown){
 if(kind==='article'){
  const slug=text(source,200)
  const result=await payload.find({collection:'pages',where:{and:[{kind:{equals:'article'}},{slug:{equals:slug}}]},limit:1,depth:0,pagination:false,overrideAccess:false,user:null,select:{title:true,slug:true,intro:true}})
  const page=result.docs[0]
  if(!page)throw new SocialError('Статията не е публикувана в сайта.')
  const link=siteLink('/'+page.slug)
  return {kind,title:page.title,link,source_key:sourceKey(kind,link),message:(page.title+'\n\n'+(page.intro||'Прочети практическото ръководство в блога на Коли от Америка.')+'\n\nВиж статията:').slice(0,2000)}
 }
 if(kind==='vehicle'){
  const target=vehicleLink(source)
  const {freshAuctionCarForSocial}=await import('../auctions')
  const {isAuctionClosed}=await import('../auction-lifecycle')
  const car=await freshAuctionCarForSocial(target.lot,target.site)
  if(!car||car.auction_status!=='active'||isAuctionClosed(car))throw new SocialError('Автомобилът няма потвърден активен търг.')
  const contact=await payload.findGlobal({slug:'site-settings',depth:0,overrideAccess:false,user:null})
  return {kind,title:car.title,link:target.link,source_key:sourceKey(kind,target.link),message:vehiclePostMessage(car,contact.phone)}
 }
 if(kind==='tip'){
  const body=text(message,2000),link=siteLink(source||'/blog/')
  if(!['/blog','/kontakti','/kalkulator'].includes(new URL(link).pathname.replace(/\/$/,'')))throw new SocialError('За съвет избери линк към блога, контактите или калкулатора.')
  return {kind,title:body.split('\n')[0].slice(0,120),message:body,link,source_key:sourceKey(kind,body)}
 }
 throw new SocialError('Избери статия, автомобил или практически съвет.')
}
export async function validateSource(payload:Payload,post:SocialPost){
 if(post.kind==='article'){
  const slug=decodeURIComponent(new URL(siteLink(post.link)).pathname.replace(/^\//,'').replace(/\/$/,''))
  await makeDraft(payload,'article',slug)
 }else if(post.kind==='vehicle')await makeDraft(payload,'vehicle',post.link)
 else siteLink(post.link)
}
export async function prepareDrafts(payload:Payload,settings:SocialSettings,now=Date.now()){
 const existing=await database(payload).all<{source_key:string;slot:string}>(q('SELECT source_key,slot FROM social_posts LIMIT 5000'))
 const keys=new Set(existing.map(p=>p.source_key)),slots=new Set(existing.map(p=>p.slot))
 const articles=await articleOptions(payload)
 let created=0,unfilled=0
 for(const date of nextSlots(settings,now)){
  const slot=date.slice(0,10)
  if(slots.has(slot))continue
  const day=Math.floor(Date.parse(date)/86400000),kind=['article','vehicle','tip'][day%3]
  const sources=kind==='article'?articles.map(p=>({source:p.slug,message:''})):kind==='vehicle'?settings.vehicles.map(source=>({source,message:''})):starterTips.map(t=>({source:t.link,message:t.message}))
  let filled=false
  for(const item of sources){
   // Skip duplicates before any paid vehicle lookup.
   const knownKey=kind==='article'?sourceKey(kind,siteLink('/'+item.source)):kind==='vehicle'?sourceKey(kind,vehicleLink(item.source).link):sourceKey(kind,item.message)
   if(keys.has(knownKey))continue
   try{
    const draft=await makeDraft(payload,kind,item.source,item.message)
    const id=await insertDraft(payload,{...draft,slot,scheduled_at:date})
    keys.add(draft.source_key)
    if(id){created++;filled=true;break}
   }catch{/* Leave the slot empty when a source cannot be verified; never invent content. */}
  }
  if(!filled)unfilled++
 }
 return {created,unfilled}
}
