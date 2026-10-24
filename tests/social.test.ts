import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultSettings } from '../src/lib/social/types'
import { siteLink,vehicleLink,sofiaInstant,sofiaLocal,nextSlots,settingsInput,sourceKey } from '../src/lib/social/validation'
import { metaConfig,publishPage,verifyPage } from '../src/lib/social/meta'
test('social schedule keeps Bulgarian wall time across both DST changes',()=>{
 assert.equal(sofiaInstant('2026-10-24T18:30'),'2026-10-24T15:30:00.000Z')
 assert.equal(sofiaInstant('2026-10-25T18:30'),'2026-10-25T16:30:00.000Z')
 assert.equal(sofiaInstant('2026-03-28T18:30'),'2026-03-28T16:30:00.000Z')
 assert.equal(sofiaInstant('2026-03-29T18:30'),'2026-03-29T15:30:00.000Z')
 assert.throws(()=>sofiaInstant('2026-02-30T18:30'))
 assert.throws(()=>sofiaInstant('2026-10-25T03:30'))
 const slots=nextSlots(defaultSettings,Date.parse('2026-10-24T00:00:00Z'))
 assert.equal(slots.length,3)
 assert.ok(slots.every(s=>sofiaLocal(s).endsWith('18:30')))
})
test('social links and configured selections cannot target private or external URLs',()=>{
 for(const value of ['https://evil.test/x','https://koliotamerika.bg@evil.test/blog','/admin','/api/users','/profil','//evil.test/x','/x#fragment'])assert.throws(()=>siteLink(value))
 assert.equal(siteLink('/test-article'),'https://koliotamerika.bg/test-article')
 assert.deepEqual(vehicleLink('/targove/kola?lot=54155906&site=1'),{lot:'54155906',site:'1',link:'https://koliotamerika.bg/targove/kola?lot=54155906&site=1'})
 assert.throws(()=>vehicleLink('/targove/kola?lot=../../api'))
 assert.throws(()=>settingsInput({...defaultSettings,weekdays:[1,1]}))
 assert.throws(()=>settingsInput({...defaultSettings,time:'03:00'}))
 assert.equal(sourceKey('article','a'),sourceKey('article','a'))
 assert.notEqual(sourceKey('article','a'),sourceKey('tip','a'))
})
test('Meta writes stay single-attempt and expose only safe result codes',async()=>{
 const config={pageId:'123456',token:'secret-fixture-never-return',version:'v26.0'}
 let calls=0
 const fake=((url:unknown,init?:RequestInit)=>{
  calls++;assert.equal(url,'https://graph.facebook.com/v26.0/123456/feed')
  assert.equal((init!.headers as Record<string,string>).Authorization,'Bearer '+config.token)
  const body=init!.body as URLSearchParams
  assert.equal(body.get('message'),'Тест');assert.equal(body.get('link'),'https://koliotamerika.bg/blog/')
  return Promise.resolve(Response.json({id:'123456_98765'}))
 }) as typeof fetch
 assert.deepEqual(await publishPage(config,'Тест','https://koliotamerika.bg/blog/',fake),{status:'published',id:'123456_98765'})
 assert.equal(calls,1)
 const timeout=(async()=>{throw new Error(config.token)}) as typeof fetch
 const result=await publishPage(config,'x','https://koliotamerika.bg/blog/',timeout)
 assert.equal(result.status,'uncertain');assert.ok(!JSON.stringify(result).includes(config.token))
 assert.deepEqual(await publishPage(config,'x','x',(async()=>Response.json({error:{code:190,message:config.token}},{status:400})) as typeof fetch),{status:'failed',code:'META_190'})
 assert.equal((await publishPage(config,'x','x',(async()=>Response.json({error:{code:1}},{status:503})) as typeof fetch)).status,'uncertain')
 assert.equal((await publishPage(config,'x','x',(async()=>Response.json({success:true})) as typeof fetch)).status,'uncertain')
 await assert.rejects(()=>verifyPage(config,(async()=>Response.json({id:'555555',name:'Wrong page'})) as typeof fetch))
 assert.equal(metaConfig({FACEBOOK_PAGE_ID:'../../me',FACEBOOK_PAGE_ACCESS_TOKEN:'x'}),null)
})
