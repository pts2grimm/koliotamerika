import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import config from '../../src/payload.config'
import { contactPhoneKey, upgradeContactPhone } from '../../src/lib/contact-phone-upgrade'
import { contactPhone } from '../../src/lib/contact-phone'
const payload = await getPayload({config})
try {
 // Fresh imports use the new default and do not expose the retired privacy contact.
 assert.equal((await payload.findGlobal({slug:'site-settings'})).phone,contactPhone)
 const privacy=(await payload.find({collection:'pages',where:{slug:{equals:'zashtita-na-lichni-danni'}},depth:0})).docs[0]
 assert.doesNotMatch(JSON.stringify(privacy.body),/359888292280/)
 await payload.delete({collection:'payload-kv',where:{key:{equals:contactPhoneKey}}})
 await payload.updateGlobal({slug:'site-settings',data:{phone:'+359 888 292 280'}})
 const editorConfig=await editorConfigFactory.default({config:payload.config})
 const body=convertHTMLToLexical({editorConfig,html:'<p>Запази ръчния текст. <a href="tel:+359888292280">+359 888 292 280</a></p>',JSDOM})
 const before=await payload.update({collection:'pages',id:privacy.id,depth:0,data:{body,status:'draft',publishedAt:'2026-01-01T07:00:00.000Z',seo:{title:'Ръчно SEO',description:'Без друга промяна',noIndex:true}}})
 const homeBefore=await payload.updateGlobal({slug:'homepage',depth:0,data:{cta:{description:'Телефон +359 888 292 280'}}})
 const carBefore=await payload.create({collection:'cars',depth:0,data:{title:'Test car',slug:'contact-test-car',status:'draft',make:'Test',model:'Car',year:2020,description:'Контакт +359888292280',seo:{noIndex:true}}})
 const create=payload.create.bind(payload)
 payload.create=(async(args:Parameters<typeof payload.create>[0])=>{
  if(args.collection==='payload-kv')throw new Error('Injected contact journal failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradeContactPhone(payload),/Injected contact journal failure/)
 payload.create=create
 assert.equal((await payload.findGlobal({slug:'site-settings'})).phone,'+359 888 292 280')
 assert.deepEqual(await payload.findByID({collection:'pages',id:privacy.id,depth:0}),before)
 assert.deepEqual(await payload.findGlobal({slug:'homepage',depth:0}),homeBefore)
 assert.equal(await upgradeContactPhone(payload),4)
 const after=await payload.findByID({collection:'pages',id:privacy.id,depth:0})
 assert.match(JSON.stringify(after.body),/tel:\+359884478885/)
 assert.match(JSON.stringify(after.body),/Запази ръчния текст/)
 for(const field of ['id','slug','status','publishedAt','seo','legacyImage','title','intro'] as const)assert.deepEqual(after[field],before[field])
 assert.equal((await payload.findGlobal({slug:'homepage'})).cta?.description,'Телефон '+contactPhone)
 assert.equal((await payload.findByID({collection:'cars',id:carBefore.id})).description,'Контакт '+contactPhone)
 await payload.updateGlobal({slug:'site-settings',data:{phone:'+359 899 111 222'}})
 assert.equal(await upgradeContactPhone(payload),0)
 assert.equal((await payload.findGlobal({slug:'site-settings'})).phone,'+359 899 111 222')
 console.log('CONTACT_PHONE_VERIFIED: fresh import, CMS upgrade, rollback, homepage/car content, publication preservation, repeat-run safety')
} finally { await payload.destroy() }
process.exit(0)
