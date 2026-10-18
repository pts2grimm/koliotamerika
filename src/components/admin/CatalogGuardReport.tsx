import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-sqlite'
import { purgeCatalogGuard } from '@/lib/catalog-guard-server'
import { guardLimits } from '@/lib/catalog-guard'
import { RefreshReport } from './OverviewControls'

export async function CatalogGuardReport({payload}:{payload:Payload}) {
  // Rendered only inside the staff-authorized catalogue admin view. No public endpoint.
  await purgeCatalogGuard(payload)
  const rows=await payload.db.drizzle.all<{ip:string;agent:string;scope:string;verified:string;last_seen:string;total:number;blocked:number;last_reason:string}>(sql`
    SELECT ip,agent,scope,verified,last_seen,total,blocked,last_reason FROM catalog_guard ORDER BY hour DESC,blocked DESC,total DESC LIMIT 100
  `)
  const sums=await payload.db.drizzle.all<{total:number;blocked:number}>(sql`
    SELECT COALESCE(SUM(total),0) AS total,COALESCE(SUM(blocked),0) AS blocked FROM catalog_guard
  `)
  const limits=guardLimits()
  const mode=process.env.TRUST_PROXY!=='true'?'Неактивна — липсва доверено прокси':process.env.CATALOG_GUARD_MODE==='off'?'Изключена':process.env.CATALOG_GUARD_MODE==='observe'?'Наблюдение — без ограничаване по квота':'Активна'
  const date=(s:string)=>new Intl.DateTimeFormat('bg-BG',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Sofia'}).format(new Date(s))
  return <section id="catalog-protection" className="koa-catalog-report__history">
    <h2>Защита на каталога</h2><RefreshReport />
    <p><strong>{mode}</strong> · {limits.minute} заявки/минута и {limits.hour} заявки/час за IP (IPv6: обща /64 мрежа). Проверените чрез DNS Google/Bing ботове са освободени от тези квоти.</p>
    <p>HTTP заявки към каталога и списъка с модели, достигнали приложението, включително HEAD и предварително зареждане. Вътрешните търсения не добавят записи. CDN кешът и блокиранията преди приложението не се виждат тук.</p>
    <p>Последни 7 дни: <strong>{sums[0].total}</strong> заявки · <strong>{sums[0].blocked}</strong> над квотата. В режим „Наблюдение“ надвишенията не се блокират. При претоварена или недостъпна защита отговорите 503 може да не са записани. Показани са до 100 почасови групи; този отчет не използва филтрите за марка/модел/период по-горе.</p>
    <div className="koa-catalog-report__table"><table><thead><tr><th>Последна заявка</th><th>IP / мрежа</th><th>Заявки за часа</th><th>Над квотата</th><th>Последна проверка</th><th>User-Agent · заявен от посетителя</th></tr></thead><tbody>
      {rows.map((row,index)=><tr key={index}><td>{date(row.last_seen)}</td><td>{row.ip}<small>{row.ip.includes(':')?'Обща IPv6 /64 квота':'IPv4'}</small></td><td>{row.total}<small>{row.scope==='vehicle'?'Автомобил':row.scope==='models'?'Модели':'Каталог'}</small></td><td>{row.blocked}<small>{row.last_reason==='hour'?'Последно: часов лимит':row.last_reason==='minute'?'Последно: минутен лимит':''}</small></td><td>{row.verified?row.verified+' · потвърден DNS':'Няма потвърдена търсачка'}</td><td style={{maxWidth:'24rem',overflowWrap:'anywhere'}}>{row.agent||'Не е подаден'}</td></tr>)}
      {!rows.length&&<tr><td colSpan={6}>Още няма HTTP заявки, отчетени от защитата.</td></tr>}
    </tbody></table></div>
  </section>
}
