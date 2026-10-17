import { sql } from '@payloadcms/db-sqlite'
import { cms } from '@/lib/data'
import { adminPeriod } from '@/lib/admin-period'
import { purgeExpiredConsents } from '@/lib/consent-audit-server'
import { consentActionLabels, type ConsentAction } from '@/lib/consent-audit'
import { csvRows } from '@/lib/consent-csv'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff' }
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  if (user?.collection !== 'users') return Response.json({ error: 'Необходим е администраторски вход.' }, { status: 403, headers })
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const period = adminPeriod(params)
  const category = params.category || ''
  const subject = /^[a-f0-9]{64}$/.test(params.subject || '') ? params.subject : ''
  const categoryClause = category === 'all' ? sql`AND analytics=1 AND marketing=1`
    : category === 'necessary' ? sql`AND analytics=0 AND marketing=0`
    : category === 'analytics' ? sql`AND analytics=1 AND marketing=0`
    : category === 'marketing' ? sql`AND analytics=0 AND marketing=1` : sql``
  const subjectClause = subject ? sql`AND subject=${subject}` : sql``
  await purgeExpiredConsents(payload)
  const rows = await payload.db.drizzle.all<{ subject: string; customer_id: number | null; name: string | null; email: string | null; analytics: number; marketing: number; action: string; policy_version: string; created_at: string }>(sql`
    SELECT subject, customer_id, (SELECT name FROM customers WHERE customers.id=consent_events.customer_id) AS name,
      (SELECT email FROM customers WHERE customers.id=consent_events.customer_id) AS email,
      analytics, marketing, action, policy_version, created_at FROM consent_events
    WHERE created_at >= ${period.start} AND created_at < ${period.end} ${categoryClause} ${subjectClause}
    ORDER BY created_at DESC, id DESC LIMIT 10001
  `)
  if (rows.length > 10000) return Response.json({ error: 'Над 10 000 записа. Избери по-кратък период или конкретен браузър.' }, { status: 422, headers })
  const format = new Intl.DateTimeFormat('bg-BG', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Sofia' })
  const csv = csvRows([['Браузър', 'Клиент ID', 'Име', 'Имейл', 'Необходими', 'Статистика', 'Реклама', 'Действие', 'Версия', 'Българско време', 'UTC'],
    ...rows.map(row => [row.subject, row.customer_id, row.name, row.email, 'Да', row.analytics ? 'Да' : 'Не', row.marketing ? 'Да' : 'Не',
      consentActionLabels[row.action as ConsentAction] || row.action, row.policy_version, format.format(new Date(row.created_at)), row.created_at])])
  return new Response(csv, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="cookie-choices-' + period.from + '-' + period.to + '.csv"' } })
}
