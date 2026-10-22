import { createHmac } from 'node:crypto'
import { sql, database } from './database'
import type { Payload } from 'payload'
import { catalogueRequestIP } from './catalog-request-ip'

export function requestLimitIdentity(headers: Pick<Headers, 'get'>) {
  return process.env.TRUST_PROXY === 'true'
    ? catalogueRequestIP(headers, true)?.address || 'unknown'
    : 'shared'
}

/** Reserve before the protected operation. SQLite serializes writes; PostgreSQL uses a transaction-scoped cap lock.
 * HMAC keys only; no raw addresses, credentials or email addresses in this table.
 * Keep the existing inquiry key format so deployment does not reset its active quota.
 */
export async function reserveSubmission(payload: Payload, value: string, limit: number, now = Date.now()) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid submission limit')
  const key = createHmac('sha256', payload.config.secret).update(value).digest('hex')
  const cutoff = new Date(now - 3600000).toISOString()
  const created = new Date(now).toISOString()
  await database(payload).run(sql`DELETE FROM submission_limits WHERE created_at <= ${cutoff}`)
  const rows = await database(payload).atomicAll(sql`
    INSERT INTO submission_limits (key, created_at, updated_at)
    SELECT ${key}, ${created}, ${created}
    WHERE (SELECT COUNT(*) FROM submission_limits WHERE key = ${key} AND created_at > ${cutoff}) < ${limit}
      AND (SELECT COUNT(*) FROM submission_limits) < 20000
    RETURNING id
  `, 'submission-limits')
  return rows.length === 1
}
