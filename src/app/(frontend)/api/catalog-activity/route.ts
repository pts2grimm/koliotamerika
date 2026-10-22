import { createHmac } from 'node:crypto'
import { sql, database } from '@/lib/database'
import { cms, siteURL } from '@/lib/data'
import { isPreview } from '@/lib/preview'
import { customerFromRequest } from '@/lib/account-server'
import { consentFromCookies } from '@/lib/tracking-consent'
import { validateCatalogActivity } from '@/lib/catalog-activity'
import { purgeCatalogActivity } from '@/lib/catalog-activity-server'
export const runtime = 'nodejs'
const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', ...(status === 429 ? { 'Retry-After': '3600' } : {}) } })
export async function POST(request: Request) {
  if (isPreview() || request.headers.get('origin') !== new URL(siteURL()).origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403)
  if (!consentFromCookies(request.headers.get('cookie') || '')?.analytics) return reply(403)
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
      if (size > 4096) { await reader.cancel(); return reply(413) }
      chunks.push(value)
    }
    const input = validateCatalogActivity(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (!input) return reply(400)
    const payload = await cms()
    const db = database(payload)
    const hash = (text: string) => createHmac('sha256', payload.secret).update(text).digest('hex')
    const subject = hash('catalog-session:' + input.receipt)
    const event = hash('catalog-event:' + subject + ':' + input.event)
    const existing = await db.all(sql`SELECT id FROM catalog_events WHERE event = ${event} LIMIT 1`)
    if (existing.length) return reply(204)
    const customer = await customerFromRequest(request)
    const now = new Date().toISOString()
    const cutoff = new Date(Date.now() - 3600000).toISOString()
    await purgeCatalogActivity(payload)
    const d = input.data
    const inserted = await db.atomicAll(sql`
      INSERT INTO catalog_events (event, subject, customer_id, kind, section, archive, make, model, year_from, year_to,
        lot, site, vin, query, result_count, outcome, filters, created_at, updated_at)
      SELECT ${event}, ${subject}, ${customer?.id ?? null}, ${d.kind}, ${d.section}, ${db.boolean(d.archive)},
        ${d.make ?? null}, ${d.model ?? null}, ${d.yearFrom ?? null}, ${d.yearTo ?? null}, ${d.lot ?? null},
        ${d.site ?? null}, ${d.vin ?? null}, ${d.query ?? null}, ${d.resultCount ?? null}, ${d.outcome ?? null},
        ${d.filters ? JSON.stringify(d.filters) : null}, ${now}, ${now}
      WHERE (SELECT COUNT(*) FROM catalog_events WHERE subject = ${subject} AND created_at >= ${cutoff}) < 120
        AND (SELECT COUNT(*) FROM catalog_events WHERE created_at >= ${cutoff}) < 5000
        AND (SELECT COUNT(*) FROM catalog_events) < 250000
      ON CONFLICT(event) DO NOTHING RETURNING id
    `, 'catalog-events')
    if (inserted.length) return reply(204)
    const duplicate = await db.all(sql`SELECT id FROM catalog_events WHERE event = ${event} LIMIT 1`)
    return reply(duplicate.length ? 204 : 429)
  } catch (error) {
    if (error instanceof SyntaxError) return reply(400)
    console.warn('Catalog activity could not be saved.')
    return reply(503)
  }
}
