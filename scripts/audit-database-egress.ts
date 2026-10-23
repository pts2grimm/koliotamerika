// Read-only production sample. Never load Payload or initialize/migrate the live database.
import { Pool } from 'pg'
import { writeFileSync } from 'node:fs'
import { postgresPool } from '../src/lib/postgres-pool'
import { databaseTraffic } from '../src/lib/database-traffic'
if(!process.env.SUPABASE_DATABASE_URL)throw new Error('SUPABASE_DATABASE_URL secret is required')
const pool=new Pool({...postgresPool({...process.env,DATABASE_URI:process.env.SUPABASE_DATABASE_URL}),max:1,options:'-c default_transaction_read_only=on -c statement_timeout=15000'})
try {
 const client=await pool.connect()
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const mode=await client.query('SHOW transaction_read_only')
  if(mode.rows[0].transaction_read_only!=='on')throw new Error('Read-only session required')
  const inventory=await client.query("SELECT relname AS table, n_live_tup AS estimated_rows, seq_scan, idx_scan FROM pg_stat_user_tables WHERE schemaname='payload' ORDER BY relname")
  // Compare the same 20 public documents in one snapshot. Only aggregate bytes leave this process.
  // This SQL sample does NOT reproduce Payload relationship population or its full query count.
  const columns=[
   ['pages','id,title,slug,intro,image_id,legacy_image,published_at'],
   ['cars','id,title,slug,make,year,price,mileage,fuel,availability,image_id']
  ]
  const measurements=[]
  for(const [table,fields] of columns){
   const read=async(projection:string)=>{
    const start=databaseTraffic.snapshot().total
    const result=await client.query('SELECT '+projection+' FROM payload.'+table+" WHERE status='published'"+(table==='pages'?" AND kind='article' AND (published_at IS NULL OR published_at <= now())":"")+' ORDER BY id LIMIT 20')
    const end=databaseTraffic.snapshot().total
    return {records:result.rows.length,queries:end.queries-start.queries,approximateBytes:end.approximateBytes-start.approximateBytes}
   }
   measurements.push({table,fullParentRows:await read('*'),cardFieldsOnly:await read(fields)})
  }
  await client.query('ROLLBACK')
  const report={checkedAt:new Date().toISOString(),environment:'production read-only sample, single repeatable-read snapshot',limitations:'Not billed egress; not an observation period. Excludes child tables, media population and Payload overhead. pg_stat table scan counters are cumulative server counters, not transferred bytes or current app request counts.',inventory:inventory.rows,measurements}
  writeFileSync('egress-production-sample.json',JSON.stringify(report,null,2))
  console.log(JSON.stringify(report))
 } finally {client.release()}
} catch {console.error('Read-only egress audit failed. No credentials, SQL parameters or row contents were logged.');process.exitCode=1}
finally {await pool.end()}
