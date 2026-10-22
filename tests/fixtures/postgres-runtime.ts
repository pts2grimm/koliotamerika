import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { database, sql } from '../../src/lib/database'
import { reserveSubmission } from '../../src/lib/submission-limit'
import { reserveCatalogRequest } from '../../src/lib/catalog-guard-server'
import { incrementCatalogTotal } from '../../src/lib/catalog-totals-server'
import { insertCatalogRequest } from '../../src/lib/catalog-requests-server'
import { catalogRequestRecord } from '../../src/lib/catalog-requests'
import { overviewData } from '../../src/lib/admin-overview'
import { adminPeriod } from '../../src/lib/admin-period'
const url = new URL(process.env.DATABASE_URI!)
assert.equal(process.env.CI, 'true')
assert.ok(['localhost','127.0.0.1'].includes(url.hostname))
const payload = await getPayload({ config, disableOnInit: true })
const db = database(payload), now = Date.now()
try {
  assert.equal(db.postgres, true)
  await db.run(sql`DELETE FROM submission_limits`)
  const reserved = await Promise.all(Array.from({length:20},()=>reserveSubmission(payload,'pg-limit',5,now)))
  assert.equal(reserved.filter(Boolean).length,5)
  assert.equal(await reserveSubmission(payload,'pg-limit',5,now+3600001),true)
  await db.run(sql`DELETE FROM submission_limits`)
  await db.run(sql`INSERT INTO submission_limits (key,created_at,updated_at) SELECT 'seed',${new Date(now).toISOString()}::timestamptz,${new Date(now).toISOString()}::timestamptz FROM generate_series(1,19999)`)
  const cap=await Promise.all(Array.from({length:10},(_,i)=>reserveSubmission(payload,'cap-'+i,5,now)))
  assert.equal(cap.filter(Boolean).length,1)
  await db.run(sql`DELETE FROM submission_limits`)
  const input={ip:'198.51.100.11',agent:'PG fixture',scope:'vehicle',verified:'' as const}
  const limits={minute:5,hour:8}
  const requests=await Promise.all(Array.from({length:12},()=>reserveCatalogRequest(payload,input,now,limits)))
  assert.equal(requests.filter(r=>!r.blocked).length,5)
  assert.equal((await reserveCatalogRequest(payload,{...input,verified:'Google'},now,limits)).blocked,false)
  await db.run(sql`DELETE FROM catalog_totals`)
  const data={kind:'search' as const,section:'cars' as const,archive:false,make:'BMW',model:'X5',lot:'',site:'',outcome:'results'}
  await Promise.all(Array.from({length:20},()=>incrementCatalogTotal(payload,data,new Date(now))))
  assert.equal((await db.all<{count:number}>(sql`SELECT count FROM catalog_totals`))[0].count,20)
  await db.run(sql`UPDATE catalog_totals SET count=49998`)
  const totals=await Promise.all(Array.from({length:10},()=>incrementCatalogTotal(payload,data,new Date(now))))
  assert.equal(totals.filter(Boolean).length,2)
  const row=catalogRequestRecord({kind:'view',provider:'eridan',params:new URLSearchParams({lot:'70000000',site:'1'})},{make:'BMW',model:'X5',count:1},now,false,now+100)
  assert.equal(await insertCatalogRequest(payload,row),true)
  assert.equal((await db.all<{n:number}>(sql`SELECT COUNT(*) AS n FROM catalog_requests WHERE ${db.contains(sql`model`,'x5')}`))[0].n,1)
  const iso=new Date(now).toISOString()
  await db.run(sql`INSERT INTO catalog_requests (created_at,kind,provider,make,model,lot,site,year_from,year_to,page,outcome,result_count,duration_ms)
    SELECT ${iso},'view','eridan','BMW','X5','','','','',1,'results',1,1 FROM generate_series(1,49997)`)
  const inserted=await Promise.all(Array.from({length:10},()=>insertCatalogRequest(payload,row)))
  assert.equal(inserted.filter(Boolean).length,2)
  const admin=await payload.create({collection:'users',data:{email:'pg-fixture@example.test',password:'Fixture-password-2026',name:'Test'}})
  assert.ok((await payload.login({collection:'users',data:{email:admin.email,password:'Fixture-password-2026'}})).token)
  await db.run(sql`INSERT INTO consent_events (event,subject,analytics,marketing,action,policy_version,created_at,updated_at)
    VALUES ('pg-consent','pg-subject',true,false,'save_preferences','test',${iso}::timestamptz,${iso}::timestamptz)`)
  const req={payload,user:{...admin,collection:'users'}} as Parameters<typeof overviewData>[0]
  const report=await overviewData(req,adminPeriod({period:'30'}),1,'analytics','')
  assert.equal(Number(report.current.analytics),1)
  assert.equal(report.history[0].analytics,1)
  assert.equal(typeof report.history[0].created_at,'string')
  console.log('PostgreSQL quotas, concurrent caps, authentication, filters and consent analytics passed.')
} finally { await payload.destroy() }
process.exit(0)
