import { sql } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'
import { catalogRetentionDays } from './catalog-activity'
export async function purgeCatalogActivity(payload: Payload, now = Date.now()) {
  await payload.db.drizzle.run(sql`DELETE FROM catalog_events WHERE created_at < ${new Date(now - catalogRetentionDays * 86400000).toISOString()}`)
}
