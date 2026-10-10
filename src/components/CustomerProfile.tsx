'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { accountAction, announceAccountChange, readSaved, savedKey, useAccount } from './AccountProvider'
import { SavedAuctions } from './SavedAuctions'
type Inquiry = { id: number; car?: string; message: string; status: 'new' | 'progress' | 'done'; createdAt: string }
const labels = { new: 'Получено', progress: 'В процес', done: 'Приключено' }
export function CustomerProfile() {
 const account = useAccount(); const [page, setPage] = useState(1); const [inquiries, setInquiries] = useState<Inquiry[]>([]); const [pages, setPages] = useState(1); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [actionError, setActionError] = useState(''); const [localCount, setLocalCount] = useState(0); const [busy, setBusy] = useState(false)
 useEffect(() => { setLocalCount(readSaved().length) }, [account.user])
 useEffect(() => {
  if (!account.user) { setInquiries([]); return }
  let active = true; setLoading(true); setError('')
  fetch(`/api/account/inquiries?page=${page}`, { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('Неуспешно зареждане на запитванията.'); return r.json() }).then(data => { if (active) { setInquiries(data.docs); setPages(data.totalPages || 1) } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
  return () => { active = false }
 }, [account.user, page])
 async function action(kind: 'logout' | 'import') {
  setBusy(true); setActionError('')
  try { await accountAction(kind, kind === 'import' ? { vehicles: readSaved() } : {}); if (kind === 'import') { localStorage.removeItem(savedKey); setLocalCount(0) }; announceAccountChange(); await account.refresh() } catch (e) { setActionError(e instanceof Error ? e.message : 'Опитай отново.') } finally { setBusy(false) }
 }
 if (!account.ready) return <section className="container section"><h1>Моят профил</h1><p role="status">{account.error || 'Зареждане…'}</p></section>
 if (!account.user) return <section className="container section account-guest"><span className="eyebrow orange">МОЯТ ГАРАЖ</span><h1>Всичко за твоята следваща кола.</h1><p>Влез, за да виждаш запазените автомобили и историята на запитванията си от всяко устройство.</p>{!account.enabled && <p className="account-notice">Клиентските акаунти се подготвят. Запазването на това устройство е достъпно.</p>}<div className="account-actions"><Link className="button button-orange" href="/vhod">Вход</Link><Link className="button button-outline" href="/registracia">Създай профил</Link></div><SavedAuctions /></section>
 return <section className="container section"><div className="section-heading"><div><span className="eyebrow orange">МОЯТ ГАРАЖ</span><h1>Здравей, {account.user.name}.</h1><p>{account.user.email}</p></div><button className="button button-outline" disabled={busy} onClick={() => action('logout')}>Изход</button></div>{actionError && <p role="alert" className="form-error">{actionError}</p>}<div className="profile-grid"><section aria-labelledby="saved-title"><h2 id="saved-title">Запазени автомобили</h2>{localCount > 0 && <div className="account-notice"><p>На това устройство има {localCount} запазени автомобила.</p><button className="button button-outline" disabled={busy} onClick={() => action('import')}>Добави ги в профила</button></div>}<SavedAuctions /></section><section aria-labelledby="inquiries-title"><h2 id="inquiries-title">Моите запитвания</h2><p>Тук се показват запитванията, изпратени след вход в профила.</p>{loading ? <p role="status">Зареждане…</p> : error ? <p role="alert">{error}</p> : <>{!inquiries.length && <div className="account-panel"><p>Все още нямаш запитвания от този профил.</p><Link className="text-link" href="/kontakti">Изпрати запитване →</Link></div>}{inquiries.map(item => <article className="inquiry-history" key={item.id}><div className="inquiry-meta"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('bg-BG')}</time><span className={`inquiry-status status-${item.status}`}>{labels[item.status] || 'Получено'}</span></div><h3>{item.car || 'Запитване за автомобил'}</h3><p>{item.message}</p></article>)}{pages > 1 && <div className="account-actions"><button className="button button-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>{page} / {pages}</span><button className="button button-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Напред</button></div>}</>}</section></div></section>
}
