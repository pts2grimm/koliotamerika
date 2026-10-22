import { sql, database } from './database'
import type { Payload } from 'payload'
import { consentLifetime } from './tracking-consent'

export async function purgeExpiredConsents(payload: Payload, now = Date.now()) {
  const cutoff = new Date(now - consentLifetime * 1000).toISOString()
  await database(payload).run(sql`DELETE FROM consent_events WHERE created_at < ${cutoff}`)
}
