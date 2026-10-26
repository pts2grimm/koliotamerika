import assert from 'node:assert/strict'
if(process.env.DATABASE_PROVIDER==='postgres'&&!/^postgresql:\/\/[^@]+@127\.0\.0\.1:/.test(process.env.DATABASE_URI||''))throw new Error('Isolated database only')
if(process.env.DATABASE_PROVIDER!=='postgres'&&!process.env.DATABASE_URI?.startsWith('file:/tmp/'))throw new Error('Isolated file only')
Object.assign(process.env,{NODE_ENV:'production',PAYLOAD_MIGRATING:'true'})
const {getPayload}=await import('payload')
const {default:config}=await import('../../src/payload.config')
const payload=await getPayload({config,disableOnInit:true})
try{
 if(process.env.DATABASE_PROVIDER!=='postgres'){
  const {migrations}=await import('../../src/migrations')
  await payload.db.migrate({migrations})
 }
 const {legacyHomeDefaults}=await import('../../src/lib/home-defaults')
 const original=await payload.findGlobal({slug:'homepage',depth:1})
 assert.match(original.hero!.title!,/Коли от Америка/)
 assert.equal(original.faq!.items!.length,4)
 assert.equal(original.trust!.photos!.length,3)
 const admin={id:1,email:'fixture@example.test',collection:'users' as const}
 await assert.rejects(()=>payload.updateGlobal({slug:'homepage',data:{hero:{title:'Forbidden'}},overrideAccess:false,user:null}))
 await payload.updateGlobal({slug:'homepage',data:{hero:{title:'Редактирано H1'},seo:{title:'Редактирано SEO',description:'Ново описание'},faq:{items:[]},services:{items:[]},trust:{photos:[],reviews:[]}},overrideAccess:false,user:admin})
 const edited=await payload.findGlobal({slug:'homepage',depth:1})
 assert.equal(edited.hero!.title,'Редактирано H1')
 assert.equal(edited.seo!.title,'Редактирано SEO')
 assert.equal(edited.faq!.items!.length,0)
 assert.equal(edited.services!.items!.length,0)
 assert.equal(edited.trust!.photos!.length,0)
 assert.equal(edited.process!.steps!.length,4)
 assert.equal(edited.initialized,true)
 await assert.rejects(()=>payload.updateGlobal({slug:'homepage',data:{hero:{href:'javascript:alert(1)'}},overrideAccess:false,user:admin}))
 // Restore fixture content without touching any production database.
 await payload.updateGlobal({slug:'homepage',data:await legacyHomeDefaults(payload),overrideAccess:false,user:admin})
 const again=await payload.findGlobal({slug:'homepage'})
 assert.equal(again.faq!.items!.length,4)
 console.log('HOMEPAGE_FIXTURE_OK',process.env.DATABASE_PROVIDER)
}finally{await payload.destroy()}
process.exit(0)
