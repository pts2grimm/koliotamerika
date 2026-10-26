import assert from 'node:assert/strict'
if(process.env.DATABASE_PROVIDER==='postgres'&&!/^postgresql:\/\/[^@]+@127\.0\.0\.1:/.test(process.env.DATABASE_URI||''))throw new Error('Isolated database only')
if(process.env.DATABASE_PROVIDER!=='postgres'&&!process.env.DATABASE_URI?.startsWith('file:/tmp/'))throw new Error('Isolated file only')
Object.assign(process.env,{NODE_ENV:'production',PAYLOAD_MIGRATING:'true'})
const {getPayload}=await import('payload')
const {default:config}=await import('../../src/payload.config')
const payload=await getPayload({config,disableOnInit:true})
const user={id:1,email:'fixture@example.test',collection:'users' as const}
try{
 const before=await payload.findGlobal({slug:'homepage'})
 await payload.updateGlobal({slug:'homepage',overrideAccess:false,user,data:{focusKeyphrase:'коли от Америка'}})
 const after=await payload.findGlobal({slug:'homepage',overrideAccess:false,user})
 assert.equal(after.focusKeyphrase,'коли от Америка')
 assert.equal(after.hero.title,before.hero.title);assert.equal(after.seo.title,before.seo.title)
 assert.equal((await payload.findGlobal({slug:'homepage',overrideAccess:false,user:null})).focusKeyphrase,undefined)
 await assert.rejects(()=>payload.updateGlobal({slug:'homepage',overrideAccess:false,user:null,data:{focusKeyphrase:'forbidden'}}))
 for(const kind of ['page','article'] as const){
  const doc=await payload.create({collection:'pages',overrideAccess:false,user,data:{title:'Примерна страница',slug:'seo-fixture-'+kind,kind,status:'published',intro:'Увод за покупка и внос.',sections:[{heading:'Проверка',body:'Полезен кратък текст.'}],seo:{title:'Примерна страница',description:'Описание на страницата.'},focusKeyphrase:'коли от Америка'}})
  const original=await payload.findByID({collection:'pages',id:doc.id,overrideAccess:false,user})
  assert.equal(original.focusKeyphrase,'коли от Америка')
  const updated=await payload.update({collection:'pages',id:doc.id,overrideAccess:false,user,data:{focusKeyphrase:'коли от Канада'}})
  assert.equal(updated.slug,original.slug);assert.equal(updated.title,original.title);assert.deepEqual(updated.sections,original.sections)
  assert.equal((await payload.findByID({collection:'pages',id:doc.id,overrideAccess:false,user:null})).focusKeyphrase,undefined)
  await assert.rejects(()=>payload.update({collection:'pages',id:doc.id,overrideAccess:false,user:null,data:{focusKeyphrase:'forbidden'}}))
 }
 const car=await payload.create({collection:'cars',overrideAccess:false,user,data:{title:'Ford Mustang',slug:'seo-fixture-car',status:'published',make:'Ford',model:'Mustang',year:2020,description:'Автомобил за тест.',focusKeyphrase:'Ford Mustang'}})
 assert.equal((await payload.findByID({collection:'cars',id:car.id,overrideAccess:false,user})).focusKeyphrase,'Ford Mustang')
 assert.equal((await payload.findByID({collection:'cars',id:car.id,overrideAccess:false,user:null})).focusKeyphrase,undefined)
 console.log('SEO_FIXTURE_OK',process.env.DATABASE_PROVIDER)
}finally{await payload.destroy()}
process.exit(0)
