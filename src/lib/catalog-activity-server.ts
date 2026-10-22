import { sql, database } from './database'
import type { Payload } from 'payload'
import { catalogRetentionDays } from './catalog-activity'
export async function purgeCatalogActivity(payload: Payload, now = Date.now()) {
  await database(payload).run(sql`DELETE FROM catalog_events WHERE created_at < ${new Date(now - catalogRetentionDays * 86400000).toISOString()}`)
}
