import assert from 'node:assert/strict'
import {getPayload} from 'payload'
import config from '../../src/payload.config'
import {upgradeClarity,clarityKey} from '../../src/lib/clarity-upgrade'
const payload=await getPayload({config,disableOnInit:true})
try {
 const slug='obshti-usloviya',key=clarityKey(slug)
 const journal=(await payload.find({collection:'payload-kv',where:{key:{equals:key}},limit:1})).docs[0]
 assert.ok(journal,'The owner-confirmed terms must have been applied')
 const page=(await payload.find({collection:'pages',where:{slug:{equals:slug}},limit:1,depth:0})).docs[0]
 const original=(journal.data as {before:{body:typeof page.body}}).before.body
 await payload.delete({collection:'payload-kv',where:{key:{equals:key}}})
 const before=await payload.update({collection:'pages',id:page.id,data:{body:original,status:'draft',title:'Keep my title'},depth:0})
 const create=payload.create.bind(payload)
 payload.create=(async(args:Parameters<typeof payload.create>[0])=>{
  if(args.collection==='payload-kv')throw new Error('Injected clarity journal failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradeClarity(payload),/Injected clarity journal failure/)
 payload.create=create
 assert.deepEqual(await payload.findByID({collection:'pages',id:page.id,depth:0}),before)
 assert.equal(await upgradeClarity(payload),1)
 const after=await payload.findByID({collection:'pages',id:page.id,depth:0})
 assert.match(JSON.stringify(after.body),/3–4 месеца/)
 for(const field of ['slug','title','status','publishedAt','image','legacyImage','seo'] as const)assert.deepEqual(after[field],before[field])
 assert.equal(await upgradeClarity(payload),0)
 // An intentional edit after the journal is never reapplied.
 await payload.update({collection:'pages',id:page.id,data:{body:original}})
 assert.equal(await upgradeClarity(payload),0)
 assert.deepEqual((await payload.findByID({collection:'pages',id:page.id,depth:0})).body,original)
} finally {await payload.destroy()}
process.exit(0)
