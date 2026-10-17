import { sql } from '@payloadcms/db-sqlite'
import type { PayloadRequest, Where } from 'payload'
import { purgeExpiredConsents } from './consent-audit-server'
import { sofiaDay, type AdminPeriod } from './admin-period'

export type ConsentRow = { id: number; subject: string; customer_id: number | null; customer_name: string | null; customer_email: string | null; analytics: number; marketing: number; action: string; policy_version: string; created_at: string }
export async function overviewData(req: PayloadRequest, period: AdminPeriod, page: number, category: string, subject: string) {
  if (req.user?.collection !== 'users') throw new Error('Administrator access required')
  const payload = req.payload
  await purgeExpiredConsents(payload)
  const interval = (start: string, end: string): Where => ({ createdAt: { greater_than_equal: start, less_than: end } })
  const count = async (collection: 'inquiries' | 'customers' | 'pages', where: Where) =>
    (await payload.count({ collection, req, overrideAccess: false, where })).totalDocs
  const [inquiries, previousInquiries, customers, previousCustomers, pending, drafts, scheduled, latestInquiries] = await Promise.all([
    count('inquiries', interval(period.start, period.end)), count('inquiries', interval(period.previousStart, period.previousEnd)),
    count('customers', interval(period.start, period.end)), count('customers', interval(period.previousStart, period.previousEnd)),
    count('inquiries', { status: { equals: 'new' } }),
    count('pages', { and: [{ kind: { equals: 'article' } }, { status: { equals: 'draft' } }] }),
    count('pages', { and: [{ kind: { equals: 'article' } }, { status: { equals: 'published' } }, { publishedAt: { greater_than: new Date().toISOString() } }] }),
    payload.find({ collection: 'inquiries', req, overrideAccess: false, depth: 0, limit: 5, sort: '-createdAt',
      select: { name: true, status: true, car: true, createdAt: true }, where: interval(period.start, period.end) }),
  ])
  const db = payload.db.drizzle
  // Select the latest recorded choice per receipt WITHIN the selected period.
  // This is not a site-wide consent rate: visitors who never choose are absent.
  const summary = async (start: string, end: string) => {
    const rows = await db.all<{ browsers: number; analytics: number; marketing: number; all_count: number; necessary: number }>(sql`
      WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY subject ORDER BY created_at DESC, id DESC) AS rn
        FROM consent_events WHERE created_at >= ${start} AND created_at < ${end}
      )
      SELECT COUNT(*) AS browsers, COALESCE(SUM(analytics),0) AS analytics, COALESCE(SUM(marketing),0) AS marketing,
        COALESCE(SUM(CASE WHEN analytics=1 AND marketing=1 THEN 1 ELSE 0 END),0) AS all_count,
        COALESCE(SUM(CASE WHEN analytics=0 AND marketing=0 THEN 1 ELSE 0 END),0) AS necessary
      FROM ranked WHERE rn=1
    `)
    return rows[0]
  }
  const categoryClause = category === 'all' ? sql`AND analytics=1 AND marketing=1`
    : category === 'necessary' ? sql`AND analytics=0 AND marketing=0`
    : category === 'analytics' ? sql`AND analytics=1 AND marketing=0`
    : category === 'marketing' ? sql`AND analytics=0 AND marketing=1` : sql``
  const subjectClause = subject ? sql`AND subject = ${subject}` : sql``
  const [current, previous, hours, totalRows, historyRows, startedRows] = await Promise.all([
    summary(period.start, period.end), summary(period.previousStart, period.previousEnd),
    db.all<{ hour: string; total: number; accepted: number }>(sql`
      SELECT strftime('%Y-%m-%dT%H:00:00Z',created_at) AS hour, COUNT(*) AS total,
        SUM(CASE WHEN analytics=1 AND marketing=1 THEN 1 ELSE 0 END) AS accepted
      FROM consent_events WHERE created_at >= ${period.start} AND created_at < ${period.end}
      GROUP BY hour ORDER BY hour
    `),
    db.all<{ total: number }>(sql`SELECT COUNT(*) AS total FROM consent_events
      WHERE created_at >= ${period.start} AND created_at < ${period.end} ${categoryClause} ${subjectClause}`),
    db.all<ConsentRow>(sql`SELECT id, subject, customer_id, (SELECT name FROM customers WHERE customers.id=consent_events.customer_id) AS customer_name, (SELECT email FROM customers WHERE customers.id=consent_events.customer_id) AS customer_email, analytics, marketing, action, policy_version, created_at FROM consent_events
      WHERE created_at >= ${period.start} AND created_at < ${period.end} ${categoryClause} ${subjectClause}
      ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`),
    db.all<{ first: string | null }>(sql`SELECT MIN(created_at) AS first FROM consent_events`),
  ])
  const daily = new Map(period.dates.map(date => [date, { date, total: 0, accepted: 0 }]))
  for (const hour of hours) {
    const point = daily.get(sofiaDay(new Date(hour.hour)))
    if (point) { point.total += Number(hour.total); point.accepted += Number(hour.accepted) }
  }
  return { inquiries, previousInquiries, customers, previousCustomers, pending, drafts, scheduled, latestInquiries: latestInquiries.docs,
    current, previous, daily: [...daily.values()], history: historyRows, historyTotal: Number(totalRows[0].total),
    eventCount: hours.reduce((sum, row) => sum + Number(row.total), 0), first: startedRows[0].first }
}
