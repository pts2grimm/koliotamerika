import type { Payload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import defaults from '../../content/home-editor-defaults.json'
import snapshot from '../../content/homepage.json'
import gallery from '../../content/legacy-gallery.json'
let converted:Promise<Record<string,any>>|undefined
export function mergeHome(base:Record<string,any>,changes:Record<string,any>):Record<string,any>{
 const out={...base}
 for(const [key,value] of Object.entries(changes)){
  if(value&&typeof value==='object'&&!Array.isArray(value)&&base[key]&&typeof base[key]==='object'&&!Array.isArray(base[key]))out[key]=mergeHome(base[key],value)
  else out[key]=value
 }
 return out
}
function plain(value:string){return {root:{type:'root',version:1,format:'',indent:0,direction:null,children:[{type:'paragraph',version:1,format:'',indent:0,direction:null,children:[{type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''}]}]}}}
export async function legacyHomeDefaults(payload:Payload){
 converted??=(async()=>{
  const editorConfig=await editorConfigFactory.default({config:payload.config})
  const result:Record<string,any>=structuredClone(defaults)
  const rich=(html:string)=>convertHTMLToLexical({editorConfig,html,JSDOM})
  result.price.body=rich(result.price.body)
  result.process.note=rich(result.process.note)
  result.process.guide=result.process.guide.map((x:any)=>({...x,body:rich(x.body)}))
  result.dealers.sideBody=rich(result.dealers.sideBody)
  result.faq.items=result.faq.items.map((x:any)=>({...x,answer:rich(x.answer)}))
  result.faq.more=rich(result.faq.more)
  result.company.body=rich(result.company.body)
  result.trust.photos=['2021 BMW M5','2021 MERCEDES BENZ GLC 300 4MATIC','2020 TOYOTA RAV4 LIMITED'].flatMap(title=>{
   const item=gallery.items.find(x=>x.title===title)
   return item?[{path:item.src,caption:item.title,alt:item.title,href:'/koli-ot-amerika-galeriya'}]:[]
  })
  return result
 })().catch(error=>{converted=undefined;throw error})
 const result=structuredClone(await converted)
 const site=await payload.findGlobal({slug:'site-settings',depth:1,overrideAccess:false,user:null})
 const oldTitles=['Следващата ти кола.\nОт другата страна на океана.','Следващата ти кола.\nПо твоите правила.']
 if(site.heroTitle&&!oldTitles.includes(site.heroTitle))result.hero.title=site.heroTitle
 result.hero.description=site.heroDescription||''
 if(site.heroImage){result.hero.image=site.heroImage;result.hero.note='';result.hero.imageAlt=typeof site.heroImage==='object'?site.heroImage.alt:'Автомобил от Коли от Америка'}
 result.trust.googleHref=site.googleMapsURL||''
 result.community.href=site.viberURL||result.community.href
 for(const item of site.faq||[]){
  const index=snapshot.faq.findIndex(q=>q.question===item.question)
  if(index>=0)result.faq.items[index].answer=plain(item.answer)
  else result.faq.items.push({question:item.question,answer:plain(item.answer)})
 }
 return result
}
