import { sql, database } from './database'
import type { Payload } from 'payload'
import { shiftDay, sofiaDay } from './admin-period'
import type { CatalogTotal } from './catalog-totals'
export async function purgeCatalogTotals(payload: Payload, now=new Date()) {
  await database(payload).run(sql`DELETE FROM catalog_totals WHERE day < ${shiftDay(sofiaDay(now),-89)}`)
}
export async function incrementCatalogTotal(payload: Payload, d: CatalogTotal, now=new Date()) {
  const day=sofiaDay(now)
  await purgeCatalogTotals(payload,now)
  // One atomic statement: concurrent requests cannot lose increments or exceed
  // the daily bound. No per-person rate limit or retry/deduplication identifier.
  const rows=await database(payload).atomicAll(sql`
    INSERT INTO catalog_totals (day,kind,section,archive,make,model,lot,site,outcome,count)
    SELECT ${day},${d.kind},${d.section},${Number(d.archive)},${d.make},${d.model},${d.lot},${d.site},${d.outcome},1
    WHERE (SELECT COALESCE(SUM(count),0) FROM catalog_totals WHERE day=${day}) < 50000
      AND (SELECT COUNT(*) FROM catalog_totals) < 100000
    ON CONFLICT(day,kind,section,archive,make,model,lot,site,outcome)
      DO UPDATE SET count=catalog_totals.count+1
    RETURNING count
  `, 'catalog-totals')
  return rows.length>0
}
