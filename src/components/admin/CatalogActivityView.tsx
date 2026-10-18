import { CatalogGuardReport } from './CatalogGuardReport'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, Link, SetStepNav } from '@payloadcms/ui'
import { notFound, redirect } from 'next/navigation'
import type { AdminViewServerProps, Where } from 'payload'
import { sql } from '@payloadcms/db-sqlite'
import { adminPeriod } from '@/lib/admin-period'
import { purgeCatalogActivity } from '@/lib/catalog-activity-server'
import { purgeCatalogRequests } from '@/lib/catalog-requests-server'
import { purgeCatalogTotals } from '@/lib/catalog-totals-server'
import { auctionFilterLabel } from '@/lib/auction-filters'
import { PeriodControls, RefreshReport } from './OverviewControls'
import { AdminAnalyticsTabs } from './AdminAnalyticsTabs'

type RequestRow = { vin:string; ip:string; ip_source:string; id:number; created_at:string; kind:string; provider:string; make:string; model:string; lot:string; site:string; year_from:string; year_to:string; page:number; outcome:string; result_count:number|null; duration_ms:number }
type Row = { id: number; kind: string; section: string; archive: number; make: string | null; model: string | null; year_from: string | null; year_to: string | null; lot: string | null; site: string | null; vin: string | null; query: string | null; filters: string | null; outcome: string | null; result_count: number | null; customer_id: number | null; customer_name: string | null; subject: string; created_at: string }
const number = (value: number) => new Intl.NumberFormat('bg-BG').format(value)
const moment = (value: string) => new Intl.DateTimeFormat('bg-BG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Sofia' }).format(new Date(value))
function filtersText(value: string | null) {
  try { return Object.entries(JSON.parse(value || '{}')).map(([key, val]) => auctionFilterLabel(key, String(val))).join(' · ') } catch { return '' }
}
export async function CatalogActivityView(props: AdminViewServerProps) {
  const { req, permissions, visibleEntities } = props.initPageResult
  const root = req.payload.config.routes.admin
  if (!req.user) redirect(root + '/login')
  if (req.user.collection !== 'users' || !permissions.canAccessAdmin) notFound()
  const params = props.searchParams || {}
  const period = adminPeriod(params)
  const kind = ['search','view','lookup'].includes(String(params.kind)) ? String(params.kind) : ''
  const make = typeof params.make === 'string' ? params.make.trim().slice(0,100) : ''
  const model = typeof params.model === 'string' ? params.model.trim().slice(0,100) : ''
  const page = typeof params.page === 'string' && /^[1-9]\d{0,4}$/.test(params.page) ? Number(params.page) : 1
  const apiPage = typeof params.apiPage === 'string' && /^[1-9]\d{0,4}$/.test(params.apiPage) ? Number(params.apiPage) : 1
  await Promise.all([purgeCatalogActivity(req.payload),purgeCatalogTotals(req.payload),purgeCatalogRequests(req.payload)])
  const db = req.payload.db.drizzle
  const where = sql`created_at >= ${period.start} AND created_at < ${period.end}
    ${kind ? sql`AND kind = ${kind}` : sql``}
    ${make ? sql`AND lower(make) = lower(${make})` : sql``}
    ${model ? sql`AND instr(lower(model), lower(${model})) > 0` : sql``}`
  const bucketWhere = sql`day >= ${period.from} AND day <= ${period.to}
    ${kind ? sql`AND kind = ${kind}` : sql``}
    ${make ? sql`AND lower(make) = lower(${make})` : sql``}
    ${model ? sql`AND instr(lower(model), lower(${model})) > 0` : sql``}`
  const [totals, popular, viewed, rows, detailTotals, requestRows, requestTotals] = await Promise.all([
    db.all<{ total: number; searches: number; views: number; empty: number }>(sql`
      SELECT COALESCE(SUM(count),0) AS total, COALESCE(SUM(CASE WHEN kind='search' THEN count ELSE 0 END),0) AS searches, COALESCE(SUM(CASE WHEN kind='view' THEN count ELSE 0 END),0) AS views,
        COALESCE(SUM(CASE WHEN kind='search' AND outcome='empty' THEN count ELSE 0 END),0) AS empty FROM catalog_totals WHERE ${bucketWhere}`),
    db.all<{ make: string; model: string; total: number }>(sql`
      SELECT make, COALESCE(NULLIF(model,''),'Всички модели') AS model, SUM(count) AS total FROM catalog_totals
      WHERE ${bucketWhere} AND kind='search' AND make != '' GROUP BY make, model ORDER BY total DESC, make, model LIMIT 10`),
    db.all<{ lot: string; site: string; make: string; model: string; total: number }>(sql`
      SELECT lot, site, MAX(make) AS make, MAX(model) AS model, SUM(count) AS total FROM catalog_totals
      WHERE ${bucketWhere} AND kind='view' GROUP BY lot, site ORDER BY total DESC, lot LIMIT 10`),
    db.all<Row>(sql`SELECT *, (SELECT name FROM customers WHERE customers.id=catalog_events.customer_id) AS customer_name
      FROM catalog_events WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT 30 OFFSET ${(page - 1)*30}`),
    db.all<{ total:number }>(sql`SELECT COUNT(*) AS total FROM catalog_events WHERE ${where}`),
    db.all<RequestRow>(sql`SELECT * FROM catalog_requests WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT 30 OFFSET ${(apiPage-1)*30}`),
    db.all<{total:number}>(sql`SELECT COUNT(*) AS total FROM catalog_requests WHERE ${where}`),
  ])
  const inquiryPage = typeof params.inquiryPage === 'string' && /^[1-9]\d{0,4}$/.test(params.inquiryPage) ? Number(params.inquiryPage) : 1
  const inquiryWhere: Where = { and: [
    { createdAt: { greater_than_equal: period.start, less_than: period.end } },
    ...(make ? [{ car: { contains: make } }] : []),
    ...(model ? [{ car: { contains: model } }] : []),
  ] }
  const inquiries = await req.payload.find({ collection: 'inquiries', req, overrideAccess: false, depth: 0,
    limit: 20, page: inquiryPage, sort: '-createdAt', where: inquiryWhere,
    select: { name: true, car: true, status: true, createdAt: true },
  })
  const totalsRow = totals[0]
  const pages = Math.max(1, Math.ceil(detailTotals[0].total / 30))
  const query = new URLSearchParams({ period: 'custom', from: period.from, to: period.to })
  if (kind) query.set('kind',kind)
  if (make) query.set('make',make)
  if (model) query.set('model',model)
  if (apiPage > 1) query.set('apiPage',String(apiPage))
  if (inquiryPage > 1) query.set('inquiryPage', String(inquiryPage))
  const inquiryURL = (next: number) => { const q = new URLSearchParams(query); q.set('page',String(page)); q.set('inquiryPage',String(next)); return root+'/catalog-activity?'+q+'#catalog-inquiries' }
  if (inquiryPage > Math.max(1,inquiries.totalPages)) redirect(inquiryURL(Math.max(1,inquiries.totalPages)))
  const pageURL = (next: number) => { const q = new URLSearchParams(query); q.set('page',String(next)); return root + '/catalog-activity?' + q }
  if (page > pages) redirect(pageURL(pages))
  const apiPages = Math.max(1, Math.ceil(requestTotals[0].total / 30))
  const apiURL = (next:number) => { const q=new URLSearchParams(query);q.set('page',String(page));q.set('apiPage',String(next));return root+'/catalog-activity?'+q+'#catalog-requests' }
  if (apiPage > apiPages) redirect(apiURL(apiPages))
  return <DefaultTemplate {...props} req={req} permissions={permissions}
    visibleEntities={{ collections: visibleEntities.collections, globals: visibleEntities.globals }}>
    <Gutter className="koa-overview koa-catalog-report">
    <SetStepNav nav={[{ label: 'API лог — каталог' }]} />
    <header className="koa-overview__header"><div><p className="koa-overview__eyebrow">ИНТЕРЕС КЪМ АВТОМОБИЛИТЕ</p><h1>Активност в каталога</h1><p>Сървърни заявки за автомобили, интерес към каталога и изпратени запитвания.</p></div>
      <a className="koa-overview__button koa-overview__button--quiet" href={root + '/collections/inquiries'}>Изпратени запитвания ↗</a></header>
    <AdminAnalyticsTabs active="catalog" root={root} />
    <p className="koa-catalog-report__notice">Сървърният журнал по-долу работи без бисквитки и пази заявки, VIN и наличния IP за 30 дни, без връзка със сесия или клиентски профил. Обобщените броячи отчитат действия и без разрешена „Статистика“, без връзка с посетител или профил. Започват от включването им и се пазят 90 дни. По-старите записи остават в подробната история, която се води само при съгласие. Броят действия не е брой различни хора; блокирани заявки не се отчитат.</p>
    <PeriodControls key={period.from + period.to} preset={period.preset} from={period.from} to={period.to} />
    <form method="get" className="koa-overview__filters">
      <input type="hidden" name="period" value="custom" /><input type="hidden" name="from" value={period.from} /><input type="hidden" name="to" value={period.to} />
      <label>Действие<select name="kind" defaultValue={kind}><option value="">Всички действия</option><option value="search">Търсения</option><option value="view">Отворени автомобили</option><option value="lookup">Проверки по лот/VIN (сървър)</option></select></label>
      <label>Марка<input name="make" defaultValue={make} maxLength={100} placeholder="Например BMW" /></label>
      <label>Модел<input name="model" defaultValue={model} maxLength={100} placeholder="Например 3 SERIES" /></label>
      <button type="submit" className="koa-overview__button koa-overview__button--quiet">Филтрирай</button>
      <Link href={root + '/catalog-activity'}>Изчисти</Link>
    </form>
    <nav className="koa-analytics-tabs" aria-label="Раздели на активността"><a href="#catalog-protection">Anti-scraping защита</a><a href="#catalog-requests">Сървърни заявки — без бисквитки</a><a href="#catalog-history">История със съгласие</a><a href="#catalog-inquiries">Изпратени запитвания</a></nav>
    <CatalogGuardReport payload={req.payload} />
    <section id="catalog-requests" className="koa-catalog-report__history">
      {process.env.TRUST_PROXY !== 'true' && <p className="koa-catalog-report__notice">IP адресите не се записват: TRUST_PROXY не е включено. Активирайте го само когато хостинг проксито контролира forwarding headers.</p>}
      <RefreshReport />
      <h2>Сървърни заявки за автомобили <small>· {number(requestTotals[0].total)} записа · без бисквитки</small></h2>
      <p>Всяка заявка към сървърната услуга за търсене или автомобил, включително при отказана статистика и отговор от кеша. Може да включва роботи, предварително зареждане и заявки за метаданни; това не е брой посетители или външни HTTP повиквания към доставчика.</p>
      <p className="koa-catalog-report__notice">VIN и IP се записват за новите заявки, когато са налични. IP може да е споделен или на VPN/прокси и не удостоверява самоличност. Последни 30 дни, до 50 000 записа. Старите общи броячи не могат да се възстановят като отделни заявки.</p>
      <div className="koa-catalog-report__table"><table><thead><tr><th>Кога</th><th>Заявка</th><th>Автомобил / търсене</th><th>Резултат</th><th>Време</th><th>IP адрес</th></tr></thead><tbody>
        {requestRows.map(row=><tr key={row.id}>
          <td>{moment(row.created_at)}</td>
          <td>{row.kind==='view'?'Автомобил':row.kind==='lookup'?'Проверка по лот / VIN':'Търсене'}<small>{row.provider==='eridan'?'Eridan':row.provider==='apicar'?'ApiCar':row.provider==='legacy'?'Legacy':'Друг доставчик'}</small></td>
          <td><strong>{[row.make,row.model].filter(Boolean).join(' ') || (row.kind==='lookup'?'Проверка на автомобил':row.kind==='view'?'Автомобил':'Каталог без марка / модел')}</strong>
            {row.lot && row.site && <small><a href={'/targove/kola?'+new URLSearchParams({lot:row.lot,site:row.site})} target="_blank" rel="noreferrer">{row.site==='1'?'Copart':'IAAI'} · Лот {row.lot} ↗</a></small>}
            {row.vin && <small>VIN <strong>{row.vin}</strong></small>}
            {row.kind==='search' && <small>Страница {row.page}{row.year_from?' · От '+row.year_from:''}{row.year_to?' · До '+row.year_to:''}</small>}
          </td>
          <td>{row.outcome==='error'?'Грешка при заявката':row.outcome==='empty'?'Без резултати':row.result_count!==null?'Върнати: '+number(row.result_count):'Успешна заявка'}</td>
          <td>{number(row.duration_ms)} ms</td>
          <td>{row.ip || 'Не е записан'}{row.ip && <small>{row.ip_source==='x-real-ip'?'X-Real-IP':'X-Forwarded-For'}</small>}</td>
        </tr>)}
        {!requestRows.length && <tr><td colSpan={6}>Още няма сървърни заявки за избрания период и филтри. Записването започва след включването на журнала.</td></tr>}
      </tbody></table></div>
      <nav className="koa-catalog-report__pages" aria-label="Страници на сървърните заявки">{apiPage>1 && <Link href={apiURL(apiPage-1)}>← Предишна</Link>}<span>Страница {apiPage} / {apiPages}</span>{apiPage<apiPages && <Link href={apiURL(apiPage+1)}>Следваща →</Link>}</nav>
    </section>
    <h2>Обобщени броячи</h2>
    <div className="koa-overview__metrics">
      {[['Търсения',totalsRow.searches],['Отворени автомобили',totalsRow.views],['Търсения без резултат',totalsRow.empty],['Изпратени запитвания',inquiries.totalDocs]].map(([label,value]) =>
        <article key={String(label)} className="koa-overview__metric"><span>{label}</span><strong>{number(Number(value))}</strong></article>)}
    </div>
    <div className="koa-catalog-report__rankings">
      <section><h2>Най-търсени модели</h2>{popular.length ? <ol>{popular.map((item,index) => <li key={index}><span>{item.make} · {item.model}</span><strong>{number(item.total)}</strong></li>)}</ol> : <p>Още няма търсения с избрана марка за този период и филтри.</p>}</section>
      <section><h2>Най-разглеждани автомобили</h2>{viewed.length ? <ol>{viewed.map(item => <li key={item.site+':'+item.lot}><a href={'/targove/kola?' + new URLSearchParams({lot:item.lot,site:item.site})} target="_blank" rel="noreferrer">{item.make} {item.model} · Лот {item.lot}</a><strong>{number(item.total)}</strong></li>)}</ol> : <p>Още няма отворени автомобили за този период и филтри.</p>}</section>
    </div>
    <section id="catalog-history" className="koa-catalog-report__history"><h2>Подробна история <small>· {number(detailTotals[0].total)} записа</small></h2>
      <p>Само при разрешена статистика. Общите броячи по-горе не се прибавят към тази история и не могат да се свържат с отделен посетител.</p>
      <div className="koa-catalog-report__table"><table><thead><tr><th>Кога</th><th>Действие</th><th>Автомобил / търсене</th><th>Резултат</th><th>Посетител</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td>{moment(row.created_at)}</td><td>{row.kind==='view'?'Отворен автомобил':'Търсене'}<small>{row.section==='powersports'?'Мотори и ATV':'Коли'}{row.archive?' · Архив':''}</small></td>
          <td><strong>{[row.make,row.model].filter(Boolean).join(' ') || (row.query ? 'Лот / VIN' : 'Каталог без филтри')}</strong>
            {row.kind==='search' && <small>{filtersText(row.filters)}{row.query ? ' · '+row.query : ''}</small>}
            {row.kind==='view' && row.lot && row.site && <><small>{row.year_from} · {row.site==='1'?'Copart':'IAAI'} · <a href={'/targove/kola?' + new URLSearchParams({lot:row.lot,site:row.site})} target="_blank" rel="noreferrer">Лот {row.lot} ↗</a></small>{row.vin && <small>VIN {row.vin}</small>}</>}
          </td>
          <td>{row.kind==='view'?'—':row.outcome==='error'?'Неуспешно зареждане':row.outcome==='empty'?'Без резултати':row.result_count!==null?number(row.result_count)+' резултата':'Има резултати'}</td>
          <td>{row.customer_id ? <Link href={root+'/collections/customers/'+row.customer_id}>{row.customer_name || 'Клиентски профил'}</Link> : 'Без вход'}<small>Сесия {row.subject.slice(0,8)}</small></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={5}>Няма записани действия за избрания период и филтри.</td></tr>}
      </tbody></table></div>
      <nav className="koa-catalog-report__pages" aria-label="Страници от активността">{page>1 && <Link href={pageURL(page-1)}>← Предишна</Link>}<span>Страница {page} / {pages}</span>{page<pages && <Link href={pageURL(page+1)}>Следваща →</Link>}</nav>
    </section>
    <section id="catalog-inquiries" className="koa-catalog-report__history"><h2>Изпратени запитвания <small>· {number(inquiries.totalDocs)} записа</small></h2>
      <p>Реално запазени запитвания, включително без разрешена статистика. Марка и модел се търсят в текста „Желан автомобил“. Филтърът „Действие“ важи само за търсенията и разглежданията. Не изчисляваме конверсия спрямо частично отчетените разглеждания.</p>
      <div className="koa-catalog-report__table"><table><thead><tr><th>Кога</th><th>Клиент</th><th>Желан автомобил</th><th>Статус</th><th>Детайли</th></tr></thead><tbody>
        {inquiries.docs.map(item => <tr key={item.id}><td>{moment(item.createdAt)}</td><td>{item.name}</td><td>{item.car || 'Не е посочен'}</td><td>{({new:'Ново',progress:'В процес',done:'Приключено'} as Record<string,string>)[item.status || 'new']}</td><td><Link href={root+'/collections/inquiries/'+item.id}>Отвори запитването ↗</Link></td></tr>)}
        {!inquiries.docs.length && <tr><td colSpan={5}>Няма запитвания за избрания период и филтри.</td></tr>}
      </tbody></table></div>
      <nav className="koa-catalog-report__pages" aria-label="Страници на запитванията">{inquiryPage>1 && <Link href={inquiryURL(inquiryPage-1)}>← Предишна</Link>}<span>Страница {inquiryPage} / {Math.max(1,inquiries.totalPages)}</span>{inquiries.hasNextPage && <Link href={inquiryURL(inquiryPage+1)}>Следваща →</Link>}</nav>
    </section>
  </Gutter></DefaultTemplate>
}
