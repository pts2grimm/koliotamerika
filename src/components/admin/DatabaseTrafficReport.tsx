'use client'
import { useState } from 'react'
import type { databaseTraffic } from '@/lib/database-traffic'
type Report=ReturnType<typeof databaseTraffic.snapshot>
const number=(n:number)=>new Intl.NumberFormat('bg-BG',{maximumFractionDigits:3}).format(n)
const date=(value:string)=>new Intl.DateTimeFormat('bg-BG',{dateStyle:'short',timeStyle:'medium',timeZone:'Europe/Sofia'}).format(new Date(value))
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
 return <section className="koa-catalog-report">
  <p><strong>Приблизителен обем — не е фактурираният egress на Supabase.</strong> Отчетът е отделен за всеки сървърен процес и се нулира при рестарт. При обновяване може да попаднеш на друг процес; провери идентификатора. Архиви, други приложения и други процеси не са включени.</p>
  <p>Измерват се дължините на съобщенията с редове, описания на колони и край на SQL операция. Не се пазят резултати, лични данни, SQL текст или параметри. Няма записи на статистика в базата. Удостоверяването на достъпа използва нормалната сесия и може да направи собствен прочит.</p>
  {!report.driverAttached&&<p role="status"><strong>В този процес още няма свързан измервател за PostgreSQL.</strong> SQLite preview не се измерва.</p>}
  <div className="koa-overview__actions"><button className="koa-overview__button" disabled={busy} onClick={refresh}>{busy?'Обновяване…':'Обнови'}</button><button className="koa-overview__button koa-overview__button--quiet" onClick={download}>Изтегли отчет (JSON)</button></div>
  {error&&<p role="alert">{error}</p>}
  <p>Начало: {date(report.startedAt)} · Край на измерването: {date(report.measuredThrough)} · Europe/Sofia</p>
  <p>Процес: <code>{report.processInstance}</code></p>
  <div className="koa-overview__metrics">
   <article><h3>SQL заявки</h3><strong>{number(report.total.queries)}</strong></article>
   <article><h3>Върнати записи</h3><strong>{number(report.total.returnedRows)}</strong></article>
   <article><h3>Приблизителни MB</h3><strong>{number(report.total.approximateMB)}</strong></article>
   <article><h3>Неуспешни заявки</h3><strong>{number(report.total.errors)}</strong></article>
  </div>
  <p>1 MB = 1 000 000 байта. Броят е по SQL операции, не по посещения. Вложен JSON се брои като един върнат ред. Обемът на JOIN се отнася към основната външна таблица, без разделяне или двойно броене. „other“ / „multiple“ означава неразпределено. TLS, свързване, COPY и друг служебен трафик не са включени.</p>
  <div className="koa-catalog-report__table"><table><thead><tr><th>Таблица</th><th>Операция</th><th>Заявки</th><th>Записи</th><th>MB ↓</th><th>Грешки</th></tr></thead><tbody>
   {report.breakdown.map(row=><tr key={row.table+':'+row.operation}><td>{row.table}</td><td>{row.operation}</td><td>{number(row.queries)}</td><td>{number(row.returnedRows)}</td><td>{number(row.approximateBytes/1_000_000)}</td><td>{number(row.errors)}</td></tr>)}
   {!report.breakdown.length&&<tr><td colSpan={6}>Все още няма измерени SQL операции в този процес.</td></tr>}
  </tbody></table></div>
 </section>
}
