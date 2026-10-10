'use client'
import { useState } from 'react'
import { SiteLink as Link } from '@/components/SiteLink'
import { useRouter, useSearchParams } from 'next/navigation'
import { accountAction, announceAccountChange, useAccount } from './AccountProvider'
type Mode = 'login' | 'register' | 'forgot' | 'reset'
const titles = { login: 'Добре дошъл отново.', register: 'Твоят избор започва тук.', forgot: 'Забравена парола?', reset: 'Избери нова парола.' }
export function CustomerAuth({ mode }: { mode: Mode }) {
 const account = useAccount(); const router = useRouter(); const search = useSearchParams()
 const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false)
 const disabled = !account.enabled || (mode === 'forgot' && !account.recovery)
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (busy || disabled) return
  const form = new FormData(event.currentTarget); setBusy(true); setError('')
  try {
   await accountAction(mode, { ...Object.fromEntries(form), consent: form.get('consent') === 'on', ...(mode === 'reset' ? { token: search.get('token') || '' } : {}) })
   if (mode === 'forgot') setSent(true)
   else { announceAccountChange(); await account.refresh(); router.replace('/profil') }
  } catch (e) { setError(e instanceof Error ? e.message : 'Опитай отново.') } finally { setBusy(false) }
 }
 return <section className="container account-section"><div className="account-intro"><span className="eyebrow orange">МОЯТ ГАРАЖ</span><h1>{titles[mode]}</h1><p>Запазвай колите, които ти харесват. Следи запитванията си. Продължи избора от всяко устройство.</p><Link className="text-link" href="/targove">Разгледай автомобилите →</Link></div><div className="account-panel">{!account.enabled && <p className="account-notice" role="note">Клиентските акаунти се подготвят. Засега можеш да запазваш автомобили на това устройство.</p>}{mode === 'forgot' && account.enabled && !account.recovery && <p role="note">Възстановяването по имейл още не е настроено. <Link href="/kontakti">Свържи се с екипа.</Link></p>}{sent ? <div role="status"><h2>Провери пощата си.</h2><p>Ако има профил с този имейл, ще получиш връзка за нова парола. Провери и папката за спам.</p></div> : <form className="inquiry-form" onSubmit={submit}><fieldset className="inquiry-fields" disabled={disabled || busy}>{mode === 'register' && <><label>Име и фамилия<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label><label>Телефон (по избор)<input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label></>}{mode !== 'reset' && <label>Имейл<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>}{mode !== 'forgot' && <label>Парола<input name="password" type="password" required minLength={mode === 'login' ? 1 : 8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />{mode !== 'login' && <small>Между 8 и 128 символа. Можеш да използваш дълга фраза.</small>}</label>}{mode === 'register' && <label className="consent"><input type="checkbox" name="consent" required /><span>Приемам <Link href="/poveritelnost" target="_blank">политиката за поверителност</Link> за създаване на профил.</span></label>}<button className="button button-orange" type="submit">{busy ? 'Изчакай…' : { login: 'Вход', register: 'Създай профил', forgot: 'Изпрати връзка', reset: 'Запази паролата' }[mode]}</button></fieldset>{error && <p className="form-error" role="alert">{error}</p>}</form>}<div className="account-links">{mode !== 'login' && <Link href="/vhod">Вече имаш профил? Вход</Link>}{mode !== 'register' && <Link href="/registracia">Създай профил</Link>}{mode === 'login' && <Link href="/zabravena-parola">Забравена парола?</Link>}</div></div></section>
}
