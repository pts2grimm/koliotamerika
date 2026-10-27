import { ConsentChart } from './ConsentChart'
import { AdminAnalyticsTabs } from './AdminAnalyticsTabs'
import { Gutter, Link, SetStepNav } from '@payloadcms/ui'
import { notFound, redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { MessageSquare, Users, Cookie, ChartNoAxesCombined, ArrowUpRight, Clock3, FileText, CalendarDays } from 'lucide-react'
import { consentLifetime } from '@/lib/tracking-consent'
import { adminPeriod } from '@/lib/admin-period'
import { overviewData } from '@/lib/admin-overview'
import { consentActionLabels, consentCategory, type ConsentAction } from '@/lib/consent-audit'
import { OverviewActions, PeriodControls } from './OverviewControls'

const number = (value: number) => new Intl.NumberFormat('bg-BG').format(value)
const date = (value: string) => new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium', timeZone: 'Europe/Sofia' }).format(new Date(value))
const moment = (value: string) => new Intl.DateTimeFormat('bg-BG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Sofia' }).format(new Date(value))
function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="koa-overview__change">{current ? 'Няма база за сравнение' : 'Без промяна'}</span>
  const delta = Math.round((current - previous) / previous * 100)
  return <span className={'koa-overview__change' + (delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : '')}>{delta > 0 ? '+' : ''}{delta}%</span>
}
export async function Overview(props: AdminViewServerProps) {
  const { req, permissions } = props.initPageResult
  const root = req.payload.config.routes.admin
  if (!req.user) redirect(root + '/login')
  if (req.user.collection !== 'users' || !permissions.canAccessAdmin) notFound()
  const params = props.searchParams || {}
  const period = adminPeriod(params)
  const page = typeof params.page === 'string' && /^[1-9]\d{0,4}$/.test(params.page) ? Number(params.page) : 1
  const category = typeof params.category === 'string' && ['all', 'necessary', 'analytics', 'marketing'].includes(params.category) ? params.category : ''
  const subject = typeof params.subject === 'string' && /^[a-f0-9]{64}$/.test(params.subject) ? params.subject : ''
  const data = await overviewData(req, period, page, category, subject)
  const pages = Math.max(1, Math.ceil(data.historyTotal / 20))
  const query = new URLSearchParams({ period: 'custom', from: period.from, to: period.to })
  if (category) query.set('category', category)
  if (subject) query.set('subject', subject)
  const pageURL = (next: number) => { const q = new URLSearchParams(query); q.set('page', String(next)); return root + '?' + q + '#consent-history' }
  if (page > pages) redirect(pageURL(pages))
  const total = Number(data.current.browsers)
  const consentComparisonAvailable = Date.parse(period.previousStart) >= Date.now() - consentLifetime * 1000
  const rate = total ? Math.round(Number(data.current.analytics) / total * 100) : 0
  const distribution = [
    { label: 'Всички категории', value: Number(data.current.all_count), tone: 'all' },
    { label: 'Само статистика', value: Number(data.current.analytics) - Number(data.current.all_count), tone: 'analytics' },
    { label: 'Само реклама', value: Number(data.current.marketing) - Number(data.current.all_count), tone: 'marketing' },
    { label: 'Само необходимите', value: Number(data.current.necessary), tone: 'necessary' },
  ]
  const statusNames: Record<string, string> = { new: 'Ново', progress: 'В процес', done: 'Приключено' }
  return <Gutter className="koa-overview">
      <SetStepNav nav={[{ label: 'Обзор и аналитика' }]} />
      <header className="koa-overview__header">
        <div><p className="koa-overview__eyebrow">КОЛИ ОТ АМЕРИКА · УПРАВЛЕНИЕ</p><h1>Обзор на сайта</h1><p>Запитванията, съдържанието и изборите за бисквитки — на едно място.</p></div>
        <OverviewActions />
      </header>
      <AdminAnalyticsTabs active="overview" root={root} />
      <PeriodControls key={period.preset + period.from + period.to} preset={period.preset} from={period.from} to={period.to} />
      <div className="koa-overview__period"><span><strong>{date(period.start)} — {date(period.to + 'T12:00:00Z')}</strong> <small>спрямо {date(period.previousStart)} — {date(period.previousTo + 'T12:00:00Z')}</small></span>
        <a href={'/api/admin/consent-export?' + query}>↓ Изтегли историята CSV</a></div>
      <div className="koa-overview__metrics">
        <article className="koa-overview__metric"><div><span>Получени запитвания</span><MessageSquare size={20} /></div><strong>{number(data.inquiries)}</strong><footer><Change current={data.inquiries} previous={data.previousInquiries} /><span>Спрямо предишния период</span></footer></article>
        <article className="koa-overview__metric"><div><span>Нови клиентски профили</span><Users size={20} /></div><strong>{number(data.customers)}</strong><footer><Change current={data.customers} previous={data.previousCustomers} /><span>Регистрации в периода</span></footer></article>
        <article className="koa-overview__metric"><div><span>Браузъри с направен избор</span><Cookie size={20} /></div><strong>{number(total)}</strong><footer>{consentComparisonAvailable ? <Change current={total} previous={Number(data.previous.browsers)} /> : <span className="koa-overview__change">Няма пълна история</span>}<span>{number(data.eventCount)} записани избора</span></footer></article>
        <article className="koa-overview__metric"><div><span>Разрешили статистика</span><ChartNoAxesCombined size={20} /></div><strong>{total ? rate + '%' : '—'}</strong><footer><span>{number(Number(data.current.analytics))} от {number(total)} браузъра с избор</span></footer></article>
      </div>
      <div className="koa-overview__main">
        <section className="koa-overview__panel">
          <header><div><h2>Избори за бисквитки</h2><p>Записани действия по дни, включително промени на избора.</p></div><span className="koa-overview__pill">За периода</span></header>
          {data.eventCount ? <><div className="koa-overview__legend"><span><i className="is-total" /> Всички действия</span><span><i className="is-accepted" /> Приети всички категории</span></div>
            <ConsentChart key={period.from + period.to} daily={data.daily} from={period.from} to={period.to} />
            <details className="koa-overview__daily"><summary>Точни стойности по дни</summary><div className="koa-overview__scroll"><table><thead><tr><th>Дата</th><th>Всички действия</th><th>Всички категории</th></tr></thead><tbody>{data.daily.map(point => <tr key={point.date}><td>{date(point.date + 'T12:00:00Z')}</td><td>{point.total}</td><td>{point.accepted}</td></tr>)}</tbody></table></div></details>
          </> : <div className="koa-overview__empty"><Cookie size={30} /><h3>Все още няма записани избори</h3><p>Данните започват да се събират след внедряването. Посетителите със запазен стар избор ще се появят, когато направят нов избор.</p></div>}
        </section>
        <aside className="koa-overview__panel koa-overview__tasks"><header><div><p className="koa-overview__eyebrow">ДНЕВЕН РЕД</p><h2>За обработка</h2><p>Текущо състояние, независимо от периода.</p></div><span className="koa-overview__live" /></header>
          {[
            { count: data.pending, label: 'Нови запитвания', sub: 'Прегледай и отговори', href: root + '/collections/inquiries?where[status][equals]=new', icon: <MessageSquare size={18} /> },
            { count: data.drafts, label: 'Чернови на статии', sub: 'Съдържание за довършване', href: root + '/blog-posts?status=draft', icon: <FileText size={18} /> },
            { count: data.scheduled, label: 'Насрочени статии', sub: 'Предстоящи публикации', href: root + '/blog-posts?status=scheduled', icon: <CalendarDays size={18} /> },
          ].map(task => <Link className="koa-overview__task" href={task.href} key={task.label}><strong>{task.count}</strong><span>{task.icon}<b>{task.label}</b><small>{task.sub}</small></span><ArrowUpRight size={18} /></Link>)}
        </aside>
      </div>
      <section className="koa-overview__panel koa-overview__distribution"><header><div><h2>Какво разрешават посетителите</h2><p>Последният избор на всеки браузър в избрания период. Не включва хората, които не са избрали.</p></div></header>
        <div className="koa-overview__distribution-grid">{distribution.map(item => <div key={item.tone}><div><span>{item.label}</span><strong>{number(item.value)} <small>({total ? Math.round(item.value / total * 100) : 0}%)</small></strong></div><div className="koa-overview__bar"><span className={'tone-' + item.tone} style={{ width: (total ? item.value / total * 100 : 0) + '%' }} /></div></div>)}</div>
      </section>
      <section id="consent-history" className="koa-overview__panel koa-overview__history"><header><div><h2>Кой какво приема</h2><p>Клиентът се свързва само ако е влязъл при избора. Един браузър не означава непременно един човек.</p></div><Cookie size={22} /></header>
        <form method="get" action={root + '#consent-history'} className="koa-overview__history-filters">
          <input type="hidden" name="period" value="custom" /><input type="hidden" name="from" value={period.from} /><input type="hidden" name="to" value={period.to} />
          {subject && <input type="hidden" name="subject" value={subject} />}
          <label>Избрани категории<select name="category" defaultValue={category}><option value="">Всички избори</option><option value="all">Всички категории</option><option value="necessary">Само необходимите</option><option value="analytics">Само статистика</option><option value="marketing">Само реклама</option></select></label>
          <button type="submit" className="koa-overview__button koa-overview__button--quiet">Филтрирай</button>
          {(subject || category) && <Link href={root + '?period=custom&from=' + period.from + '&to=' + period.to + '#consent-history'}>Изчисти филтрите</Link>}
          <span>{number(data.historyTotal)} записа{subject ? ' · Избран браузър' : ''}</span>
        </form>
        {data.history.length ? <div className="koa-overview__scroll"><table><thead><tr><th>Посетител</th><th>Статистика</th><th>Реклама</th><th>Действие</th><th>Кога / версия</th></tr></thead><tbody>{data.history.map(row => {
          const q = new URLSearchParams(query); q.set('subject', row.subject); q.delete('page')
          return <tr key={row.id}><td>{row.customer_id ? <><Link href={root + '/collections/customers/' + row.customer_id}>{row.customer_name || 'Клиент #' + row.customer_id}</Link><small>{row.customer_email}</small></> : <b>Без свързан профил</b>}
            <Link className="koa-overview__receipt" href={root + '?' + q + '#consent-history'}>Браузър {row.subject.slice(0, 10)} ↗</Link></td>
            <td><span className={'koa-overview__badge ' + (row.analytics ? 'is-yes' : 'is-no')}>{row.analytics ? 'Разрешена' : 'Отказана'}</span></td>
            <td><span className={'koa-overview__badge ' + (row.marketing ? 'is-yes' : 'is-no')}>{row.marketing ? 'Разрешена' : 'Отказана'}</span></td>
            <td>{consentActionLabels[row.action as ConsentAction] || row.action}<small>{consentCategory(Boolean(row.analytics), Boolean(row.marketing))}</small></td>
            <td>{moment(row.created_at)}<small>Версия {row.policy_version}</small></td></tr>
        })}</tbody></table></div> : <p className="koa-overview__empty-row">Няма избори за тези филтри.</p>}
        {pages > 1 && <nav aria-label="Страници от историята на бисквитките" className="koa-overview__pagination">{page > 1 && <Link href={pageURL(page - 1)}>← Предишна</Link>}<span>Страница {page} от {pages}</span>{page < pages && <Link href={pageURL(page + 1)}>Следваща →</Link>}</nav>}
        <p className="koa-overview__note"><Clock3 size={14} /> Пазим история за 180 дни. Необходимите бисквитки са винаги включени.{data.first ? ' Най-ранен наличен запис: ' + moment(data.first) + '.' : ''} Блокирани или неуспешни заявки не присъстват в отчета.</p>
      </section>
      <section className="koa-overview__panel"><header><div><h2>Последни запитвания</h2><p>Получени в избрания период.</p></div><Link href={root + '/collections/inquiries'}>Виж всички ↗</Link></header>
        {data.latestInquiries.length ? <div className="koa-overview__scroll"><table><thead><tr><th>Клиент</th><th>Автомобил</th><th>Статус</th><th>Получено</th></tr></thead><tbody>{data.latestInquiries.map(inquiry => <tr key={inquiry.id}><td><Link href={root + '/collections/inquiries/' + inquiry.id}>{inquiry.name}</Link></td><td>{inquiry.car || '—'}</td><td>{statusNames[inquiry.status || 'new']}</td><td>{moment(inquiry.createdAt)}</td></tr>)}</tbody></table></div> : <p className="koa-overview__empty-row">Няма запитвания в този период.</p>}
      </section>
    </Gutter>
}
