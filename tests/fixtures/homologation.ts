import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { initializeContent } from '../../src/lib/initialize-content'
import { upgradeHomologation, homologationKey } from '../../src/lib/homologation-upgrade'
const payload=await getPayload({config,disableOnInit:true})
try{
 await initializeContent(payload,{preview:true,importLegacy:true})
 assert.equal(await upgradeHomologation(payload),0)
 await payload.delete({collection:'payload-kv',where:{key:{equals:homologationKey('complete')}}})
 const item=await payload.create({collection:'pages',data:{slug:'homologation-fixture',title:'Ръчно заглавие',intro:'Съдействие за Технотест',kind:'article',status:'draft',publishedAt:'2099-02-03T09:00:00.000Z',seo:{title:'Ръчно SEO',description:'Ръчно описание',noIndex:true}}})
 const before=await payload.findByID({collection:'pages',id:item.id,depth:0})
 const create=payload.create.bind(payload)
 payload.create=(async(args:Parameters<typeof payload.create>[0])=>{
  if(args.collection==='payload-kv')throw new Error('Injected homologation journal failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradeHomologation(payload),/Injected homologation journal failure/)
 payload.create=create
 assert.deepEqual(await payload.findByID({collection:'pages',id:item.id,depth:0}),before)
 assert.equal(await upgradeHomologation(payload),1)
 const after=await payload.findByID({collection:'pages',id:item.id,depth:0})
 assert.equal(after.intro,'Съдействие за Индивидуално одобряване')
 for(const field of ['id','title','slug','publishedAt','status','seo'] as const)assert.deepEqual(after[field],before[field])
 assert.equal(await upgradeHomologation(payload),0)
 console.log('HOMOLOGATION_TRANSACTION: rollback, retry, idempotency and editorial preservation passed')
}finally{await payload.destroy()}
process.exit(0)
