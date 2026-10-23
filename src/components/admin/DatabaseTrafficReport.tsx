'use client'
import { useState } from 'react'
import type { databaseTraffic } from '@/lib/database-traffic'
type Report=ReturnType<typeof databaseTraffic.snapshot>
const number=(n:number)=>new Intl.NumberFormat('bg-BG',{maximumFractionDigits:3}).format(n)
const date=(value:string)=>new Intl.DateTimeFormat('bg-BG',{dateStyle:'short',timeStyle:'medium',timeZone:'Europe/Sofia'}).format(new Date(value))
const tableNames:Record<string,string>={
 pages:'Страници и блог',pages_sections:'Секции на страниците',cars:'Автомобили',cars_gallery:'Галерии на автомобилите',cars_features:'Оборудване на автомобилите',
 media:'Снимки и файлове',inquiries:'Запитвания',auction_quotes:'Оферти за автомобили',redirects:'Пренасочвания',
 users:'Администратори',users_sessions:'Администраторски сесии',customers:'Клиенти',customers_sessions:'Клиентски сесии',saved_vehicles:'Запазени автомобили',
 invoices:'Invoice документи',invoices_vehicles:'Автомобили във фактурите',invoice_settings:'Настройки на Invoice',bills_of_sale:'BOS документи',
 consent_events:'История на съгласията',catalog_events:'Действия в каталога',catalog_totals:'Обобщения на каталога',catalog_requests:'Заявки към каталога',catalog_guard:'Защита на каталога',
 site_settings:'Настройки на сайта',site_settings_faq:'Често задавани въпроси',calculator_settings:'Настройки на калкулатора',calculator_settings_tiers:'Тарифи на калкулатора',
 integrations:'Интеграции',submission_limits:'Ограничения на формите',payload_kv:'Служебни стойности',payload_locked_documents:'Заключени документи',payload_locked_documents_rels:'Връзки на заключени документи',
 payload_preferences:'Предпочитания на панела',payload_preferences_rels:'Връзки на предпочитанията',payload_migrations:'Миграции',other:'Други / служебни',multiple:'Няколко операции'
}
const operationNames:Record<string,string>={SELECT:'Прочит',INSERT:'Добавяне',UPDATE:'Обновяване',DELETE:'Изтриване',BEGIN:'Начало на транзакция',COMMIT:'Потвърждение',ROLLBACK:'Отмяна',SET:'Настройка',SHOW:'Проверка на настройка',CREATE:'Създаване',ALTER:'Промяна на структура',DROP:'Премахване',TRUNCATE:'Изчистване',OTHER:'Друга операция',MULTIPLE:'Няколко операции'}
export function DatabaseTrafficReport({initial}:{initial:Report}) {
 const [report,setReport]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function refresh() {
  setBusy(true);setError('')
  try {
   const response=await fetch('/api/admin/database-traffic',{credentials:'same-origin',cache:'no-store'})
   if(!response.ok)throw new Error()
   setReport(await response.json())
  } catch {setError('Отчетът не беше обновен. Провери връзката и администраторската сесия.')} finally {setBusy(false)}
 }
 function download() {
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download='database-traffic-'+report.measuredThrough.replace(/[:.]/g,'-')+'.json';a.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <section className="koa-catalog-report koa-database-traffic" aria-label="Отчет за трафика на базата">
  <div className="koa-database-traffic__toolbar">
   <p>Период: <strong>{date(report.startedAt)} – {date(report.measuredThrough)}</strong><span> · българско време</span></p>
   <div className="koa-overview__actions">
    <button className="koa-overview__button koa-overview__button--quiet" disabled={busy} onClick={refresh}>{busy?'Обновяване…':'Обнови'}</button>
    <button className="koa-overview__button koa-overview__button--quiet" onClick={download}>Изтегли отчет (JSON)</button>
   </div>
  </div>
  {error&&<p role="alert">{error}</p>}
  {!report.driverAttached&&<p role="status"><strong>В този процес още няма свързан измервател за PostgreSQL.</strong> SQLite preview не се измерва.</p>}
  <div className="koa-overview__metrics">
   <article className="koa-overview__metric"><h3>Приблизителен трафик</h3><strong>{number(report.total.approximateMB)} <span>MB</span></strong></article>
   <article className="koa-overview__metric"><h3>SQL заявки</h3><strong>{number(report.total.queries)}</strong></article>
   <article className="koa-overview__metric"><h3>Върнати записи</h3><strong>{number(report.total.returnedRows)}</strong></article>
   <article className="koa-overview__metric"><h3>Неуспешни заявки</h3><strong>{number(report.total.errors)}</strong></article>
  </div>
  <p className="koa-database-traffic__notice">Това е приблизителен обем на отговорите от базата, а не фактурираният egress на Supabase. Броячите са за текущия сървърен процес и започват отново след рестарт. Други процеси, приложения и архиви не са включени.</p>
  <div className="koa-database-traffic__table-panel">
   <div className="koa-catalog-report__table koa-database-traffic__scroll" role="region" aria-label="Трафик по таблица и операция" tabIndex={0}>
    <table><thead><tr><th scope="col">Данни</th><th scope="col">Действие</th><th scope="col">Заявки</th><th scope="col">Записи</th><th scope="col" aria-sort="descending">MB ↓</th><th scope="col">Дял</th><th scope="col">Грешки</th></tr></thead><tbody>
     {report.breakdown.map(row=><tr key={row.table+':'+row.operation}>
      <td><strong>{tableNames[row.table]||row.table}</strong><small>{row.table}</small></td>
      <td>{operationNames[row.operation]||row.operation}<small>{row.operation}</small></td>
      <td>{number(row.queries)}</td><td>{number(row.returnedRows)}</td><td>{number(row.approximateBytes/1_000_000)}</td>
      <td>{number(report.total.approximateBytes?100*row.approximateBytes/report.total.approximateBytes:0)}%</td><td>{number(row.errors)}</td>
     </tr>)}
     {!report.breakdown.length&&<tr><td colSpan={7}>Все още няма измерени SQL операции в този процес.</td></tr>}
    </tbody></table>
   </div>
  </div>
  <details className="koa-database-traffic__details">
   <summary>Как се измерва трафикът</summary>
   <p>Процес: <code>{report.processInstance}</code>. При обновяване може да попаднеш на друг процес; сравнявай идентификатора и периода.</p>
   <p>Измерват се дължините на съобщенията с редове, описания на колони и край на SQL операция. Не се пазят резултати, лични данни, SQL текст или параметри. Няма записи на статистика в базата. Удостоверяването използва нормалната администраторска сесия и може да направи собствен прочит.</p>
   <p>1 MB = 1 000 000 байта. Броят е по SQL операции, не по посещения. Вложен JSON се брои като един върнат ред. Обемът на JOIN се отнася към основната външна таблица, без разделяне или двойно броене. „other“ / „multiple“ означава неразпределено. TLS, свързване, COPY и друг служебен трафик не са включени. Неуспешните отговори се броят като грешки, но обемът им не се измерва.</p>
  </details>
 </section>
}
