import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'
import type { CatalogRequestRecord } from './catalog-requests'
export const catalogRequestRetentionDays = 30
export async function purgeCatalogRequests(payload: Payload, now = Date.now()) {
  await payload.db.drizzle.run(sql`DELETE FROM catalog_requests WHERE created_at < ${new Date(now - catalogRequestRetentionDays * 86400000).toISOString()}`)
}
export async function insertCatalogRequest(payload: Payload, d: CatalogRequestRecord) {
  await purgeCatalogRequests(payload)
  const rows = await payload.db.drizzle.all<{id:number}>(sql`
    INSERT INTO catalog_requests (created_at,kind,provider,make,model,lot,site,year_from,year_to,page,outcome,result_count,duration_ms,vin,ip,ip_source)
    SELECT ${d.createdAt},${d.kind},${d.provider},${d.make},${d.model},${d.lot},${d.site},${d.yearFrom},${d.yearTo},${d.page},${d.outcome},${d.resultCount},${d.durationMs},${d.vin},${d.ip},${d.ipSource}
    WHERE (SELECT COUNT(*) FROM catalog_requests) < 50000
    RETURNING id`)
  return rows.length > 0
}
