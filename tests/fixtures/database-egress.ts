import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Pool, Query } from 'pg'
import { postgresPool } from '../../src/lib/postgres-pool'
import { databaseTraffic } from '../../src/lib/database-traffic'
import { articleCardSelect, carCardSelect, adminContentSelect, sitemapSelect } from '../../src/lib/list-projections'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
assert.equal(process.env.CI,'true')
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URI!).hostname))
const pool=new Pool(postgresPool())
const snap=()=>databaseTraffic.snapshot().total
const before=snap()
await pool.query('select $1::text as value',['Пример'])
let after=snap()
assert.equal(after.queries-before.queries,1)
assert.equal(after.returnedRows-before.returnedRows,1)
assert(after.approximateBytes>before.approximateBytes)
await new Promise<void>((resolve,reject)=>pool.query('select 1 as n',(error,result)=>{
 if(error)return reject(error)
 assert.equal(result.rows[0].n,1);resolve()
}))
await pool.query({name:'egress-prepared',text:'select $1::int as n',values:[2]})
await pool.query({name:'egress-prepared',text:'select $1::int as n',values:[3]})
const client=await pool.connect()
await new Promise<void>((resolve,reject)=>{
 const query=client.query(new Query('select generate_series(1,3) as n'))
 let rows=0
 query.on('row',()=>rows++);query.on('error',reject)
 query.on('end',()=>{assert.equal(rows,3);resolve()})
})
client.release()
const multiBefore=snap()
await pool.query('select 1; select 2')
assert.equal(snap().queries-multiBefore.queries,2)
assert.equal(snap().returnedRows-multiBefore.returnedRows,2)
const errorsBefore=snap().errors
await assert.rejects(pool.query('select no_such_column'))
assert.equal(snap().errors-errorsBefore,1)
await Promise.all(Array.from({length:10},()=>pool.query('select 1')))
await pool.end()
const payload=await getPayload({config,disableOnInit:true})
const reports:unknown[]=[]
try {
 for(let i=0;i<20;i++)await payload.create({collection:'pages',data:{
  title:'Fixture article '+i,slug:'egress-fixture-'+i,kind:'article',status:'published',intro:'Fixture introduction',
  publishedAt:'2026-01-01T00:00:00.000Z',
  body:{root:{type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'paragraph',version:1,direction:null,format:'',indent:0,children:[{type:'text',version:1,text:'Само синтетичен текст. '.repeat(500),format:0,detail:0,mode:'normal',style:''}]}]}},
  sections:[{heading:'Fixture section',body:'Подробен текст. '.repeat(300)}],
  seo:{title:'Fixture SEO',description:'Fixture metadata'}
 }})
 for(let i=0;i<3;i++)await payload.create({collection:'cars',data:{title:'Fixture car '+i,slug:'egress-car-'+i,status:'published',make:'BMW',model:'X5',year:2020,description:'Fixture car description '.repeat(600),features:[{label:'Test equipment'}]}})
 const measure=async(name:string,read:()=>Promise<{docs:unknown[]}>)=>{
  const start=snap();const result=await read();const end=snap()
  return {name,docs:result.docs,queries:end.queries-start.queries,returnedRows:end.returnedRows-start.returnedRows,approximateBytes:end.approximateBytes-start.approximateBytes}
 }
 const compare=async(name:string,before:()=>Promise<{docs:unknown[]}>,after:()=>Promise<{docs:unknown[]}>,fields:Record<string,true>)=>{
  const a=await measure(name,before),b=await measure(name,after)
  for(let i=0;i<a.docs.length;i++)for(const key of Object.keys(fields))assert.deepEqual((a.docs[i] as Record<string,unknown>)[key],(b.docs[i] as Record<string,unknown>)[key])
  assert.equal(a.docs.length,b.docs.length)
  assert(b.approximateBytes<a.approximateBytes,name+' must reduce actual driver response bytes')
  reports.push({name,before:{queries:a.queries,returnedRows:a.returnedRows,approximateBytes:a.approximateBytes},after:{queries:b.queries,returnedRows:b.returnedRows,approximateBytes:b.approximateBytes},reductionPercent:100*(1-b.approximateBytes/a.approximateBytes)})
 }
 await compare('blog-list-6',()=>payload.find({collection:'pages',overrideAccess:false,user:null,sort:'-publishedAt',limit:6}),()=>payload.find({collection:'pages',overrideAccess:false,user:null,sort:'-publishedAt',limit:6,depth:1,select:articleCardSelect}),articleCardSelect)
 await compare('admin-content-20',()=>payload.find({collection:'pages',depth:0,limit:20,sort:'-updatedAt'}),()=>payload.find({collection:'pages',depth:0,limit:20,sort:'-updatedAt',select:adminContentSelect}),adminContentSelect)
 await compare('sitemap-pages-100',()=>payload.find({collection:'pages',overrideAccess:false,user:null,depth:0,limit:100}),()=>payload.find({collection:'pages',overrideAccess:false,user:null,depth:0,limit:100,select:sitemapSelect}),sitemapSelect)
 await compare('car-cards-3',()=>payload.find({collection:'cars',overrideAccess:false,user:null,limit:3}),()=>payload.find({collection:'cars',overrideAccess:false,user:null,limit:3,depth:1,select:carCardSelect}),carCardSelect)
 const admin=await payload.create({collection:'users',data:{email:'egress-admin@example.test',password:'Egress-test-password-2026',name:'Egress test'}})
 await payload.create({collection:'customers',data:{email:'egress-customer@example.test',password:'Egress-test-password-2026',name:'Egress test',consentedAt:new Date().toISOString()}})
 assert(admin.id)
 const output={environment:'isolated CI PostgreSQL 17; synthetic fixtures; not production egress',sameRowsAndParameters:true,measurements:reports}
 writeFileSync('egress-fixture-report.json',JSON.stringify(output,null,2))
 console.log(JSON.stringify(output))
} finally {await payload.destroy()}
process.exit(0)
