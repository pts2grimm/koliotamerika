import type { Payload } from 'payload'
import { sql, database } from '@/lib/database'
import { purgeCatalogGuard } from '@/lib/catalog-guard-server'
import { guardLimits } from '@/lib/catalog-guard'
import { RefreshReport } from './OverviewControls'
import { CatalogGuardTable } from './CatalogGuardTable'

export async function CatalogGuardReport({payload}:{payload:Payload}) {
  // Rendered only inside the staff-authorized catalogue admin view. No public endpoint.
  await purgeCatalogGuard(payload)
  const rows=await database(payload).all<{ip:string;agent:string;scope:string;verified:string;last_seen:string;total:number;blocked:number;last_reason:string}>(sql`
    SELECT ip,agent,scope,verified,last_seen,total,blocked,last_reason FROM catalog_guard ORDER BY hour DESC,blocked DESC,total DESC LIMIT 100
  `)
  const sums=await database(payload).all<{total:number;blocked:number}>(sql`
    SELECT COALESCE(SUM(total),0) AS total,COALESCE(SUM(blocked),0) AS blocked FROM catalog_guard
  `)
  const limits=guardLimits()
  const mode=process.env.TRUST_PROXY!=='true'?'Неактивна — липсва доверено прокси':process.env.CATALOG_GUARD_MODE==='off'?'Изключена':process.env.CATALOG_GUARD_MODE==='observe'?'Наблюдение — без ограничаване по квота':'Активна'
  const date=(s:string)=>new Intl.DateTimeFormat('bg-BG',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Sofia'}).format(new Date(s))
  return <section id="catalog-protection" className="koa-catalog-report__history koa-catalog-guard">
    <header className="koa-catalog-guard__header"><div><h2>Защита на каталога</h2><p><strong>{mode}</strong> · {limits.minute}/минута · {limits.hour}/час за IP</p></div><RefreshReport /></header>
    <p className="koa-catalog-guard__totals">Последни 7 дни: <strong>{sums[0].total}</strong> заявки · <strong>{sums[0].blocked}</strong> над квотата</p>
    <details className="koa-catalog-guard__help"><summary>Какво показва отчетът</summary>
      <p>HTTP заявки към каталога и списъка с модели, достигнали приложението, включително HEAD и предварително зареждане. Вътрешните търсения не добавят записи. CDN кешът и блокиранията преди приложението не се виждат тук.</p>
      <p>IPv6 адресите споделят /64 квота. Проверените чрез DNS Google/Bing ботове са освободени от квотите. User-Agent е заявен от посетителя и сам по себе си не доказва кой е ботът.</p>
      <p>В режим „Наблюдение“ надвишенията не се блокират. При претоварена или недостъпна защита отговорите 503 може да не са записани. Отчетът съдържа до 100 последни почасови групи, по 10 на страница; не използва филтрите за марка/модел/период по-горе.</p>
    </details>
    <CatalogGuardTable rows={rows.map(row=>({...row,date:date(row.last_seen)}))} />
  </section>
}
