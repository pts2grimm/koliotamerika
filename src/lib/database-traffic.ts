import { randomUUID } from 'node:crypto'

// Only schema-owned names and fixed operation labels may enter the report.
const tables = new Set(["catalog_events","invoices_vehicles","invoices","bills_of_sale","consent_events","users_sessions","users","customers_sessions","customers","saved_vehicles","media","cars_gallery","cars_features","cars","pages_sections","pages","inquiries","auction_quotes","redirects","submission_limits","payload_kv","payload_locked_documents","payload_locked_documents_rels","payload_preferences","payload_preferences_rels","payload_migrations","invoice_settings","site_settings_faq","site_settings","calculator_settings_tiers","calculator_settings","integrations","catalog_totals","catalog_requests","catalog_guard"])
const operations = new Set(['SELECT','INSERT','UPDATE','DELETE','BEGIN','COMMIT','ROLLBACK','SET','SHOW','CREATE','ALTER','DROP','TRUNCATE'])
export type TrafficLabel = { table: string; operation: string }
export function queryLabel(input: unknown): TrafficLabel {
 if (typeof input !== 'string' || input.length > 1_000_000) return { table: 'other', operation: 'OTHER' }
 // Discard literals/comments locally. Never retain SQL, parameters, aliases, or errors.
 const clean = input.replace(/--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|'(?:''|\\.|[^'])*'|\$([a-zA-Z_][a-zA-Z_0-9]*|)\$[\s\S]*?\$\1\$/g, ' ')
 const tokens = clean.match(/"(?:[^"]|"")*"|[a-z_][a-z_0-9]*|[().;]/gi) || []
 if (tokens.slice(0,-1).includes(';')) return { table: 'multiple', operation: 'MULTIPLE' }
 let depth=0, bestDepth=Infinity, table='other', operation='OTHER'
 for (let i=0;i<tokens.length;i++) {
  const token=tokens[i].toUpperCase()
  if(token==='('){depth++;continue}
  if(token===')'){depth--;continue}
  if(depth===0 && operation==='OTHER' && operations.has(token)) operation=token
  if(['FROM','JOIN','INTO','UPDATE'].includes(token)) {
   let name=tokens[i+1]
   if(tokens[i+2]==='.') name=tokens[i+3]
   name=name?.replace(/^"|"$/g,'')
   if(tables.has(name) && depth<bestDepth){table=name;bestDepth=depth}
  }
 }
 return {table,operation}
}
type Bucket = TrafficLabel & { queries:number; returnedRows:number; approximateBytes:number; errors:number }
export function createTrafficMeter(now=Date.now) {
 const startedAt=new Date(now()).toISOString(), processInstance=randomUUID()
 const buckets=new Map<string,Bucket>()
 let driverAttached=false
 return {
  attach(){driverAttached=true},
  record(label:TrafficLabel, bytes:number, rows=0, queries=0, errors=0) {
   // Defensive allowlist even when a caller supplies its own label.
   const table=tables.has(label.table)||label.table==='multiple'?label.table:'other'
   const operation=operations.has(label.operation)||label.operation==='MULTIPLE'?label.operation:'OTHER'
   const key=table+':'+operation
   const bucket=buckets.get(key)||{table,operation,queries:0,returnedRows:0,approximateBytes:0,errors:0}
   for(const [field,value] of Object.entries({approximateBytes:bytes,returnedRows:rows,queries,errors})) {
    if(Number.isSafeInteger(value)&&value>=0) bucket[field as 'queries']+=value
   }
   buckets.set(key,bucket)
  },
  snapshot() {
   const breakdown=[...buckets.values()].map(row=>({...row})).sort((a,b)=>b.approximateBytes-a.approximateBytes||a.table.localeCompare(b.table))
   const total=breakdown.reduce((a,b)=>({queries:a.queries+b.queries,returnedRows:a.returnedRows+b.returnedRows,approximateBytes:a.approximateBytes+b.approximateBytes,errors:a.errors+b.errors}),{queries:0,returnedRows:0,approximateBytes:0,errors:0})
   return {version:1,processInstance,startedAt,measuredThrough:new Date(now()).toISOString(),driverAttached,
    scope:'PostgreSQL responses in this server process only; reset on restart',
    method:'DataRow + RowDescription + CommandComplete message lengths; MB = bytes / 1000000. Not provider billed egress. Excludes TLS, connection, notices, COPY and other protocol overhead. Nested JSON counts as one returned row. Failed responses count as errors; their bytes are omitted.',
    attribution:'Primary outer table; joins are not split between tables. other/multiple are intentionally unassigned. Queries counts completed SQL statements, plus failed statements, not HTTP requests. In-flight rows may precede statement completion.',
    total:{...total,approximateMB:total.approximateBytes/1_000_000},breakdown}
  },
 }
}
const key=Symbol.for('koa.database-traffic.v1')
const scope=globalThis as typeof globalThis & {[key:symbol]:ReturnType<typeof createTrafficMeter>|undefined}
export const databaseTraffic=scope[key] ||= createTrafficMeter()
