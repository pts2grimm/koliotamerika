import pg from 'pg'
import { createClient } from '@libsql/client'
import { postgresPool } from '../src/lib/postgres-pool.ts'
const quote=value=>'"'+value.replaceAll('"','""')+'"'
let client,source,read,stage='configuration'
try {
 const url=new URL(process.env.DATABASE_URI||'')
 const project='jiyjkhdcngzpvdxbiprs'
 if(!(url.hostname==='db.'+project+'.supabase.co'||(url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username)==='postgres.'+project)))throw new Error('Unexpected target')
 client=new pg.Client(postgresPool());await client.connect()
 if(!client.connection.stream.encrypted||!client.connection.stream.authorized)throw new Error('TLS required')
 await client.query('BEGIN READ ONLY')
 stage='target inventory'
 const targets=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='payload' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(x=>x.table_name)
 for(const name of targets){
  const count=(await client.query('SELECT COUNT(*) AS count FROM payload.'+quote(name))).rows[0].count
  console.log('Target table:',name,'rows:',count)
 }
 const columns=(await client.query("SELECT table_name,column_name,data_type,column_default,is_nullable FROM information_schema.columns WHERE table_schema='payload' ORDER BY table_name,ordinal_position")).rows
 source=createClient({url:process.env.SOURCE_DATABASE_URI,authToken:process.env.SOURCE_DATABASE_AUTH_TOKEN})
 read=await source.transaction('read')
 stage='source structure comparison'
 const sources=(await read.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows.map(x=>String(x.name)).filter(x=>x!=='payload_migrations')
 console.log('Source-only tables:',JSON.stringify(sources.filter(x=>!targets.includes(x))))
 console.log('Target-only tables:',JSON.stringify(targets.filter(x=>x!=='payload_migrations'&&!sources.includes(x))))
 for(const table of sources){
  const sc=(await read.execute('PRAGMA table_info('+quote(table)+')')).rows.map(x=>String(x.name))
  const tc=columns.filter(x=>x.table_name===table)
  const missing=sc.filter(x=>!tc.some(c=>c.column_name===x))
  const required=tc.filter(x=>!sc.includes(x.column_name)&&x.is_nullable==='NO'&&!x.column_default).map(x=>x.column_name)
  if(missing.length||required.length)console.log('Column mismatch:',table,JSON.stringify({missing,required}))
 }
 console.log('Read-only inspection completed; no data was changed.')
 await client.query('ROLLBACK');await read.rollback()
}catch(error){console.error('Read-only inspection failed at:',stage,'code:',/^[A-Z0-9_]{3,40}$/.test(error.code||'')?error.code:'VALIDATION_FAILED');process.exitCode=1}
finally {if(read&&!read.closed)await read.rollback().catch(()=>{});source?.close();await client?.end().catch(()=>{})}
