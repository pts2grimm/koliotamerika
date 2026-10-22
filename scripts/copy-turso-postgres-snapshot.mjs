import {createClient} from '@libsql/client'
import pg from 'pg'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

const quote = value => '"'+value.replaceAll('"','""')+'"'
const schema = 'payload'
let stage='configuration', source, read, target
function fail() { throw new Error('Transfer validation failed') }
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical)
  if(value && typeof value==='object' && !(value instanceof Date) && !Buffer.isBuffer(value))
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
  return value
}
function normalize(value, type) {
  if(value===null||value===undefined)return null
  if(type==='boolean'){
    if([0,0n,false].includes(value))return false
    if([1,1n,true].includes(value))return true
    fail()
  }
  if(type==='json'||type==='jsonb')return canonical(typeof value==='string'?JSON.parse(value):value)
  if(type.startsWith('timestamp')||type==='date'){
    const date=new Date(value);if(!Number.isFinite(date.getTime()))fail()
    return type==='date'?date.toISOString().slice(0,10):date.toISOString()
  }
  if(['integer','smallint','bigint','numeric','real','double precision'].includes(type)){
    const number=Number(value);if(!Number.isFinite(number)||Math.abs(number)>Number.MAX_SAFE_INTEGER)fail()
    return number
  }
  if(type==='bytea')return Buffer.from(value).toString('base64')
  return String(value)
}
function digest(rows,columns) {
  const hashes=rows.map(row=>createHash('sha256').update(JSON.stringify(columns.map(c=>normalize(row[c.column_name],c.data_type)))).digest('hex')).sort()
  return createHash('sha256').update(hashes.join('\n')).digest('hex')
}
try{
  const sourceURL=new URL(process.env.SOURCE_DATABASE_URI||'')
  const destination=new URL(process.env.DATABASE_URI||'')
  const local=process.env.CI==='true'&&['127.0.0.1','localhost'].includes(destination.hostname)
  if(!['libsql:','https:'].includes(sourceURL.protocol)||!sourceURL.hostname.endsWith('.turso.io'))fail()
  if(!process.env.SOURCE_DATABASE_AUTH_TOKEN)fail()
  if(!['postgres:','postgresql:'].includes(destination.protocol))fail()
  if(!local){
    const project='jiyjkhdcngzpvdxbiprs'
    const expected=destination.hostname==='db.'+project+'.supabase.co'||(destination.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(destination.username)==='postgres.'+project)
    if(!expected||destination.port&&destination.port!=='5432'||process.env.MIGRATION_SOURCE_FROZEN!=='true')fail()
  }
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])destination.searchParams.delete(key)
  const ca=process.env.DATABASE_CA_CERT||(process.env.DATABASE_CA_FILE?readFileSync(process.env.DATABASE_CA_FILE,'utf8'):undefined)
  if(!local&&!ca)fail()
  source=createClient({url:sourceURL.toString(),authToken:process.env.SOURCE_DATABASE_AUTH_TOKEN})
  target=new pg.Client({connectionString:destination.toString(),ssl:local?false:{rejectUnauthorized:true,ca},connectionTimeoutMillis:15000,statement_timeout:120000,application_name:'koa-migration'})
  await target.connect()
  if(!local&&(!target.connection.stream.encrypted||!target.connection.stream.authorized))fail()
  // A read transaction provides a consistent source snapshot and cannot modify Turso.
  read=await source.transaction('read')
  await target.query('BEGIN')
  await target.query("SET LOCAL lock_timeout='10s'")
  await target.query("SET LOCAL search_path TO payload")
  await target.query('SELECT pg_advisory_xact_lock(1701022, 999)')
  stage='schema inventory'
  const sourceTables=(await read.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.map(r=>String(r.name)).filter(n=>n!=='payload_migrations')
  if(!['users','pages','bills_of_sale','invoices','invoice_settings'].every(t=>sourceTables.includes(t)))fail()
  const columns=(await target.query("SELECT table_name,column_name,data_type,column_default,is_nullable FROM information_schema.columns WHERE table_schema=$1 ORDER BY table_name,ordinal_position",[schema])).rows
  const targetTables=[...new Set(columns.map(c=>c.table_name))].filter(n=>n!=='payload_migrations')
  if(sourceTables.some(t=>!targetTables.includes(t))||targetTables.some(t=>!sourceTables.includes(t)))fail()
  const foreign=(await target.query("SELECT c.conname,t.relname AS child,p.relname AS parent FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_class p ON p.oid=c.confrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='f' AND n.nspname=$1",[schema])).rows
  const ordered=[],remaining=new Set(sourceTables)
  while(remaining.size){
    const next=[...remaining].find(t=>foreign.filter(f=>f.child===t&&f.parent!==t).every(f=>!remaining.has(f.parent)))
    if(!next)fail()
    ordered.push(next);remaining.delete(next)
  }
  for(const table of ordered){
    stage='validate empty target '+table
    const occupied=await target.query('SELECT EXISTS(SELECT 1 FROM '+quote(schema)+'.'+quote(table)+' LIMIT 1) AS occupied')
    if(occupied.rows[0].occupied)fail()
    const sourceColumns=(await read.execute('PRAGMA table_info('+quote(table)+')')).rows.map(r=>String(r.name))
    const dest=columns.filter(c=>c.table_name===table)
    if(sourceColumns.some(c=>!dest.some(d=>d.column_name===c)))fail()
    if(dest.some(c=>!sourceColumns.includes(c.column_name)&&c.is_nullable==='NO'&&!c.column_default))fail()
  }
  // Finish the consistent source snapshot before slow remote target writes.
  // A frozen source stays unchanged; no Turso transaction is kept idle during PostgreSQL inserts.
  const snapshots=new Map()
  for(const table of ordered){
    stage='snapshot '+table
    const dest=columns.filter(c=>c.table_name===table)
    const sourceColumns=(await read.execute('PRAGMA table_info('+quote(table)+')')).rows.map(r=>String(r.name))
    const shared=dest.filter(c=>sourceColumns.includes(c.column_name))
    const rows=[]
    for(let offset=0;;offset+=500){
      const chunk=await read.execute({sql:'SELECT * FROM '+quote(table)+' LIMIT 500 OFFSET ?',args:[offset]})
      rows.push(...chunk.rows)
      if(chunk.rows.length<500)break
    }
    snapshots.set(table,{shared,rows})
  }
  await read.rollback()
  read=undefined
  console.log('Consistent source snapshot completed; source transaction closed before target inserts.')
  let total=0
  for(const table of ordered){
    stage='copy '+table
    const {shared,rows}=snapshots.get(table)
    for(let start=0;start<rows.length;start+=100){
      const chunk=rows.slice(start,start+100), values=[]
      const placeholders=chunk.map(row=>'('+shared.map(col=>{
        let value=normalize(row[col.column_name],col.data_type)
        if(value!==null&&['json','jsonb'].includes(col.data_type))value=JSON.stringify(value)
        if(value!==null&&col.data_type==='bytea')value=Buffer.from(value,'base64')
        values.push(value);return '$'+values.length
      }).join(',')+')').join(',')
      await target.query('INSERT INTO '+quote(schema)+'.'+quote(table)+' ('+shared.map(c=>quote(c.column_name)).join(',')+') VALUES '+placeholders,values)
    }
    stage='verify '+table
    const copied=(await target.query('SELECT '+shared.map(c=>quote(c.column_name)).join(',')+' FROM '+quote(schema)+'.'+quote(table))).rows
    if(copied.length!==rows.length||digest(copied,shared)!==digest(rows,shared))fail()
    for(const column of shared.filter(c=>c.column_default?.includes('nextval('))){
      await target.query('SELECT setval(pg_get_serial_sequence($1,$2), COALESCE((SELECT MAX('+quote(column.column_name)+') FROM '+quote(schema)+'.'+quote(table)+'),1), EXISTS(SELECT 1 FROM '+quote(schema)+'.'+quote(table)+'))',[schema+'.'+table,column.column_name])
    }
    total+=rows.length
    console.log('Verified table:',table,'rows:',rows.length)
  }
  stage='commit'
  await target.query('COMMIT')
  console.log('Transfer verified:',ordered.length,'tables;',total,'rows. Source unchanged.')
}catch(error){
  await target?.query('ROLLBACK').catch(()=>{})
  console.error('Transfer stopped at:',stage,'code:',/^[A-Z0-9_]{3,40}$/.test(error.code||'')?error.code:'VALIDATION_FAILED')
  process.exitCode=1
}finally{
  if(read&&!read.closed)await read.rollback().catch(()=>{})
  source?.close()
  await target?.end().catch(()=>{})
}
