import { customerFromRequest } from '@/lib/account-server'
import { createHmac } from 'node:crypto'
import { sql } from '@payloadcms/db-sqlite'
import { cms, siteURL } from '@/lib/data'
import { isPreview } from '@/lib/preview'
import { validateConsentSubmission } from '@/lib/consent-audit'
import { purgeExpiredConsents } from '@/lib/consent-audit-server'

export const runtime = 'nodejs'
const reply = (status: number) => new Response(null, { status, headers: {
  'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}),
} })
export async function POST(request: Request) {
  if (isPreview()) return reply(403)
  if (request.headers.get('origin') !== new URL(siteURL()).origin) return reply(403)
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415)
  const reader = request.body?.getReader()
  if (!reader) return reply(400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 2048) { await reader.cancel(); return reply(413) }
      chunks.push(value)
    }
    const input = validateConsentSubmission(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (!input) return reply(400)
    const payload = await cms()
    const customer = await customerFromRequest(request)
    const hash = (value: string) => createHmac('sha256', payload.secret).update(value).digest('hex')
    const subject = hash('consent-receipt:' + input.receipt)
    const event = hash('consent-event:' + subject + ':' + input.event)
    const now = new Date().toISOString()
    const cutoff = new Date(Date.now() - 3600000).toISOString()
    await purgeExpiredConsents(payload)
    const existing = await payload.db.drizzle.all(sql`SELECT id FROM consent_events WHERE event = ${event} LIMIT 1`)
    if (existing.length) return reply(204)
    // One atomic INSERT bounds both receipt activity and total public writes.
    // No client IP or user agent is retained. These are abuse bounds, not visitor counts.
    const saved = await payload.db.drizzle.all(sql`
      INSERT INTO consent_events (event, subject, analytics, marketing, action, policy_version, customer_id, created_at, updated_at)
      SELECT ${event}, ${subject}, ${Number(input.analytics)}, ${Number(input.marketing)}, ${input.action}, ${input.policyVersion}, ${customer?.id ?? null}, ${now}, ${now}
      WHERE (SELECT COUNT(*) FROM consent_events WHERE subject = ${subject} AND created_at >= ${cutoff}) < 20
        AND (SELECT COUNT(*) FROM consent_events WHERE created_at >= ${cutoff}) < 5000
      ON CONFLICT(event) DO NOTHING RETURNING id
    `)
    if (saved.length) return reply(204)
    const duplicate = await payload.db.drizzle.all(sql`SELECT id FROM consent_events WHERE event = ${event} LIMIT 1`)
    return reply(duplicate.length ? 204 : 429)
  } catch (error) {
    if (error instanceof SyntaxError) return reply(400)
    console.warn('Consent audit could not be saved; the browser preference remains valid.')
    return reply(503)
  }
}
