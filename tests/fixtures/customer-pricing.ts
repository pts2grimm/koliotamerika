import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import config from '../../src/payload.config'
import additions from '../../content/customer-pricing-2026-10.json'
import { plainLanguageKey } from '../../src/lib/plain-language-upgrade'
import { stable } from '../../src/lib/content-review-upgrade'
import { upgradeCustomerPricing, customerPricingKey } from '../../src/lib/customer-pricing-upgrade'
const payload=await getPayload({config,disableOnInit:true})
try{
 const rows=await payload.find({collection:'payload-kv',limit:additions.length,where:{key:{in:additions.map(x=>customerPricingKey(x.slug))}}})
 assert.equal(rows.totalDocs,additions.length,'All affected pages must receive their details')
 for(const row of rows.docs) assert.equal((row.data as {bodyPreserved:boolean}).bodyPreserved,false,row.key)
 assert.equal(await upgradeCustomerPricing(payload),0)
 const slug='vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena'
 const key=customerPricingKey(slug)
 const page=(await payload.find({collection:'pages',limit:1,depth:0,where:{slug:{equals:slug}}})).docs[0]
 assert.equal(page.body!.root.children.filter(x=>x.type==='table').length,5,'Tables must survive HTML conversion and database storage')
 assert.match(JSON.stringify(page.body),/18 335.44/)
 assert.doesNotMatch(JSON.stringify(page.body),/secured|clean/i)
 assert.match(JSON.stringify(page.body),/Наша цена за покупка и обработка/)
 assert.match(JSON.stringify(page.body),/Не е нужно да разбираш от търгове/)
 assert.match(JSON.stringify(page.body),/400–\$900/)
 const prior=(await payload.find({collection:'payload-kv',limit:1,where:{key:{equals:plainLanguageKey(slug)}}})).docs[0].data as {applied:{body:typeof page.body}}
 await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
 const before=await payload.update({collection:'pages',id:page.id,depth:0,data:{body:prior.applied.body,status:'draft',title:'Запазено заглавие'}})
 const create=payload.create.bind(payload)
 payload.create=(async(args:Parameters<typeof payload.create>[0])=>{
  if(args.collection==='payload-kv')throw new Error('Injected customer-pricing journal failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradeCustomerPricing(payload),/Injected customer-pricing journal failure/)
 payload.create=create
 assert.deepEqual(await payload.findByID({collection:'pages',id:page.id,depth:0}),before,'Failed journal must roll back the body too')
 assert.equal(await upgradeCustomerPricing(payload),1)
 const after=await payload.findByID({collection:'pages',id:page.id,depth:0})
 for(const field of ['slug','title','status','publishedAt','image','legacyImage','seo'] as const)assert.deepEqual(after[field],before[field])
 await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
 const editorConfig=await editorConfigFactory.default({config:payload.config})
 const custom=convertHTMLToLexical({editorConfig,html:'<p>Ръчна промяна на цените.</p>',JSDOM})
 await payload.update({collection:'pages',id:page.id,data:{body:custom}})
 assert.equal(await upgradeCustomerPricing(payload),0)
 assert.equal(stable((await payload.findByID({collection:'pages',id:page.id,depth:0})).body),stable(custom))
 assert.equal(await upgradeCustomerPricing(payload),0)
}finally{await payload.destroy()}
process.exit(0)
