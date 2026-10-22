// Runs only after the operator has confirmed the Hostinger write freeze.
import pg from 'pg'
import { spawnSync } from 'node:child_process'
import { postgresPool } from '../src/lib/postgres-pool.ts'
import { supabaseCA } from '../src/lib/supabase-ca.ts'
const revision = '75fe5b653cd5e30aa99c70f2d96d451ab6c7cfc7'
const project = 'jiyjkhdcngzpvdxbiprs'
const origin = 'https://koliotamerika.bg'
const quote = value => '"' + value.replaceAll('"','""') + '"'
let stage='configuration', client
function requireOK(value) { if(!value) throw new Error('Cutover validation failed') }
async function maintenance() {
  for(const [path,method] of [['/','GET'],['/admin','GET'],['/api/inquiry','POST'],['/api/consent-choice','POST'],['/api/catalog-activity','POST'],['/api/users/login','POST']]) {
    const response=await fetch(origin+path+'?migration_check='+Date.now(),{
      method,redirect:'manual',signal:AbortSignal.timeout(20000),
      headers:{'Cache-Control':'no-cache','Content-Type':'application/json',Origin:origin},
      ...(method==='POST'?{body:'{}'}:{})
    })
    requireOK(response.status===503 && response.headers.get('retry-after')==='300')
    requireOK((response.headers.get('cache-control')||'').includes('no-store'))
    requireOK((await response.text()).includes('Кратка техническа профилактика.'))
  }
}
function runScript(file) {
  const result=spawnSync(process.execPath,['--import','tsx',file],{
    env:{...process.env,DATABASE_CA_CERT:supabaseCA,MIGRATION_SOURCE_FROZEN:'true'},
    encoding:'utf8',maxBuffer:16*1024*1024,timeout:600000
  })
  // Never expose a child exception's SQL parameters or document contents.
  requireOK(result.status===0)
  if(file.endsWith('copy-turso-postgres.mjs')){
    const summary=result.stdout.split('\n').find(line=>/^Transfer verified: \d+ tables; \d+ rows\. Source unchanged\.$/.test(line))
    requireOK(summary);console.log(summary)
  }
}
try {
  requireOK(process.env.GITHUB_REF==='refs/heads/codex/supabase-cutover-2026-10-22')
  const url=new URL(process.env.DATABASE_URI||'')
  requireOK(['postgres:','postgresql:'].includes(url.protocol))
  requireOK(url.hostname==='db.'+project+'.supabase.co'||(url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username)==='postgres.'+project))
  requireOK(!url.port||url.port==='5432')
  requireOK(process.env.SOURCE_DATABASE_URI && process.env.SOURCE_DATABASE_AUTH_TOKEN)
  stage='verified application revision'
  const diff=spawnSync('git',['diff','--exit-code',revision,'--','src','package.json','package-lock.json','scripts/prepare-postgres.ts','scripts/copy-turso-postgres.mjs'],{encoding:'utf8'})
  requireOK(diff.status===0)
  const checks=await fetch('https://api.github.com/repos/pts2grimm/koliotamerika/actions/runs?head_sha='+revision+'&per_page=100',{
    headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json'},
    signal:AbortSignal.timeout(20000)
  })
  requireOK(checks.ok)
  const runs=(await checks.json()).workflow_runs
  requireOK(runs.some(run=>run.head_sha===revision&&run.path==='.github/workflows/supabase-migration.yml'&&run.status==='completed'&&run.conclusion==='success'))
  stage='live maintenance gate'
  await maintenance()
  stage='empty target and verified TLS'
  client=new pg.Client(postgresPool())
  await client.connect()
  requireOK(client.connection.stream.encrypted && client.connection.stream.authorized)
  const tables=(await client.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('payload','public') AND table_type='BASE TABLE'")).rows
  for(const table of tables){
    if(table.table_schema==='payload'&&table.table_name==='payload_migrations')continue
    requireOK(!(await client.query('SELECT EXISTS(SELECT 1 FROM '+quote(table.table_schema)+'.'+quote(table.table_name)+' LIMIT 1) AS occupied')).rows[0].occupied)
  }
  await client.end();client=undefined
  stage='private schema preparation'
  runScript('scripts/prepare-postgres.ts')
  stage='maintenance recheck'
  await maintenance()
  stage='source snapshot copy and full-row verification'
  runScript('scripts/copy-turso-postgres.mjs')
  stage='private schema permissions'
  client=new pg.Client(postgresPool())
  await client.connect()
  const roles=(await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')")).rows
  for(const role of roles){
    requireOK(!(await client.query("SELECT has_schema_privilege($1,'payload','USAGE') AS allowed",[role.rolname])).rows[0].allowed)
  }
  stage='maintenance retained after transfer'
  await maintenance()
  console.log('Supabase transfer verified. Hostinger is still in maintenance; database connection has not been switched by this workflow.')
} catch(error) {
  console.error('Cutover stopped at:',stage,'code:',/^[A-Z0-9_]{3,40}$/.test(error.code||'')?error.code:'VALIDATION_FAILED')
  console.error('Keep maintenance enabled and retain Turso. Do not retry against a populated target.')
  process.exitCode=1
} finally {
  await client?.end().catch(()=>{})
}
