import type { Payload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import snapshot from '../../content/wordpress.json'
export async function importContent(payload: Payload) {
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.default>> | undefined
 let count=0
 for (const item of snapshot.items) {
  if ((await payload.count({ collection:'pages', where:{slug:{equals:item.slug}} })).totalDocs)continue
  editorConfig ??= await editorConfigFactory.default({ config: payload.config })
  const body=convertHTMLToLexical({ editorConfig, html:item.html, JSDOM })
  await payload.create({collection:'pages',data:{ title:item.title,slug:item.slug,status:'published',kind:item.kind as 'page'|'article',intro:item.intro,body,legacyImage:item.coverPath,sourceURL:item.sourceURL,publishedAt:item.date,sections:[],seo:{title:item.seoTitle?.slice(0,70),description:item.seoDescription?.slice(0,180)} }})
  count++
 }
 const redirects=[['/za-nas','/amerikanski-sajt-za-koli'],['/poveritelnost','/zashtita-na-lichni-danni'],['/tehnotest','/homologacia'],['/polezna-informaciq','/aukcioni-za-koli-v-amerika'],['/polezna-informaciq/vnos-na-koli-ot-amerika','/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena'],['/blagodarim-vi','/kontakti']]
 for(const [from,to] of redirects) if(!(await payload.count({collection:'redirects',where:{from:{equals:from}}})).totalDocs) await payload.create({collection:'redirects',data:{from,to}})
 const site=await payload.findGlobal({slug:'site-settings'})
 const defaults = {phone:'+359 888 292 280',email:'office@koliotamerika.bg',address:'София, ул. Стар Лозенски път',workingHours:'Понеделник – Петък, 09:00 – 17:00',facebookURL:'https://www.facebook.com/koliotamerika',viberURL:'https://invite.viber.com/?g2=AQBf2nuz85eJe1JY6ulMhdFRCDVjUHmNSdbAEnHgqAjWvqKA3%2FiJ%2FJ6vadMAgs1C'}
 const missing = Object.fromEntries(Object.entries(defaults).filter(([key]) => site[key as keyof typeof defaults] == null))
 if (Object.keys(missing).length) await payload.updateGlobal({ slug: 'site-settings', data: missing })
 return count
}
