import { createHmac } from 'node:crypto'
import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'
import { guardIdentity, guardLimits, safeAgent } from './catalog-guard'
import type { Crawler } from './verified-crawler'

export const guardRetentionHours = 24 * 7
export async function purgeCatalogGuard(payload:Payload, now=Date.now()) {
  await payload.db.drizzle.run(sql`DELETE FROM catalog_guard WHERE hour < ${Math.floor(now/3600000)-guardRetentionHours+1}`)
}
export async function reserveCatalogRequest(payload:Payload, input:{ip:string;agent:string;scope:string;verified:Crawler}, now=Date.now(), limits=guardLimits()) {
  const identity=guardIdentity(input.ip)
  if(!identity) throw new Error('Catalogue guard requires a validated proxy address')
  const key=createHmac('sha256',payload.config.secret).update('catalogue:'+identity).digest('hex')
  const hour=Math.floor(now/3600000),minute=Math.floor(now/60000),db=payload.db.drizzle
  const trusted=Number(Boolean(input.verified))
  // One incoming HTTP request updates one hourly bucket. Atomic across instances.
  const minuteCount=sql`CASE WHEN catalog_guard.minute=${minute} THEN catalog_guard.minute_count+1 ELSE 1 END`
  const blocked=sql`CASE WHEN ${trusted}=1 THEN 0 WHEN catalog_guard.total>=${limits.hour} OR (${minuteCount})>${limits.minute} THEN 1 ELSE 0 END`
  const reason=sql`CASE WHEN ${trusted}=1 THEN '' WHEN catalog_guard.total>=${limits.hour} THEN 'hour' WHEN (${minuteCount})>${limits.minute} THEN 'minute' ELSE '' END`
  const rows=await db.all<{last_blocked:number;last_reason:string;total:number;minute_count:number}>(sql`
    INSERT INTO catalog_guard (key,hour,minute,minute_count,total,blocked,last_blocked,last_reason,ip,agent,scope,verified,last_seen)
    SELECT ${key},${hour},${minute},1,1,0,0,'',${input.ip},${safeAgent(input.agent)},${input.scope},${input.verified},${new Date(now).toISOString()}
    WHERE EXISTS(SELECT 1 FROM catalog_guard WHERE key=${key} AND hour=${hour})
      OR (SELECT COUNT(*) FROM catalog_guard)<50000
    ON CONFLICT(key,hour) DO UPDATE SET
      minute=${minute},minute_count=${minuteCount},total=catalog_guard.total+1,
      blocked=catalog_guard.blocked+(${blocked}),last_blocked=${blocked},last_reason=${reason},
      ip=excluded.ip,agent=excluded.agent,scope=excluded.scope,verified=excluded.verified,last_seen=excluded.last_seen
    RETURNING last_blocked,last_reason,total,minute_count
  `)
  const row=rows[0]
  if(!row) return {blocked:true,reason:'capacity',retryAfter:60}
  const window=row.last_reason==='hour'?3600000:60000
  return {blocked:Boolean(row.last_blocked),reason:row.last_reason,retryAfter:Math.max(1,Math.ceil((window-now%window)/1000))}
}
