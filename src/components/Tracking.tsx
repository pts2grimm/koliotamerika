'use client'
import { recordConsentChoice } from '@/lib/consent-audit-browser'
import type { ConsentAction } from '@/lib/consent-audit'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { PublicIntegrations } from '@/lib/integration-config'
import { privateTrackingPath } from '@/lib/integration-config'
import { consentCookie, consentLifetime, type Consent } from '@/lib/tracking-consent'
import { browserConsent, permitted, storeConsent, syncTracking, trackContact, trackLead, trackPage, trackingStarted, withdrawTracking } from '@/lib/tracking-browser'

export function CookieSettingsButton() {
  return <button type="button" className="cookie-settings-link" onClick={() => window.dispatchEvent(new Event('koa:cookie-settings'))}>Настройки на бисквитките</button>
}
export function Tracking({ config }: { config: PublicIntegrations }) {
  const pathname = usePathname()
  const [consent, setConsent] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const saved = browserConsent()
    if (!saved?.analytics) { try { sessionStorage.removeItem('koa-catalog-session') } catch {} }
    setConsent(saved); setAnalytics(saved?.analytics || false); setMarketing(saved?.marketing || false); setReady(true)
    const show = () => {
      previousFocus.current = document.activeElement as HTMLElement
      const current = browserConsent()
      setAnalytics(current?.analytics || false); setMarketing(current?.marketing || false); setDetails(true); setOpen(true)
      requestAnimationFrame(() => panel.current?.focus())
    }
    const changed = () => {
      const current = browserConsent()
      if (!current?.analytics) { try { sessionStorage.removeItem('koa-catalog-session') } catch {} }
      withdrawTracking(current || { analytics: false, marketing: false })
      location.reload() // Remove already-loaded libraries, listeners and pending queues.
    }
    const storage = (event: StorageEvent) => { if (event.key === consentCookie) changed() }
    const expired = () => { if (trackingStarted() && !browserConsent()) changed() }
    window.addEventListener('koa:cookie-settings', show)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', expired)
    const timer = window.setInterval(expired, 60000)
    return () => { window.removeEventListener('koa:cookie-settings', show); window.removeEventListener('storage', storage); window.removeEventListener('focus', expired); clearInterval(timer) }
  }, [config])
  useEffect(() => {
    if (!ready) return
    // Choosing cookies is available even when tracking is disabled or this is a preview host.
    // Provider scripts retain their separate enabled, hostname and category checks below.
    setOpen(!privateTrackingPath(pathname) && !browserConsent())
  }, [pathname, ready])
  useEffect(() => {
    if (!ready) return
    // Account screens never retain an analytics library from an earlier SPA page.
    if (privateTrackingPath(pathname) && trackingStarted()) { location.reload(); return }
    if (!consent || !permitted(config, pathname)) return
    syncTracking(config, consent, pathname)
    trackPage(config, pathname)
  }, [config, consent, pathname, ready])
  useEffect(() => {
    const lead = (event: Event) => trackLead(config, (event as CustomEvent<string>).detail)
    const contact = (event: MouseEvent) => {
      const href = (event.target instanceof Element ? event.target.closest('a') : null)?.getAttribute('href') || ''
      if (href.startsWith('tel:')) trackContact(config, 'phone')
      else if (href.startsWith('mailto:')) trackContact(config, 'email')
      else if (/^(?:viber:|https:\/\/(?:invite\.)?viber\.com)/.test(href)) trackContact(config, 'viber')
    }
    window.addEventListener('koa:lead', lead); document.addEventListener('click', contact)
    return () => { window.removeEventListener('koa:lead', lead); document.removeEventListener('click', contact) }
  }, [config])
  function save(analytics: boolean, marketing: boolean, action: ConsentAction) {
    const previous = browserConsent()
    const next = storeConsent({ analytics, marketing })
    if (!analytics) { try { sessionStorage.removeItem('koa-catalog-session') } catch {} }
    window.dispatchEvent(new Event('koa:consent-updated'))
    recordConsentChoice(analytics, marketing, action)
    setConsent(next); setOpen(false)
    if (previous && ((previous.analytics && !analytics) || (previous.marketing && !marketing))) {
      withdrawTracking(next)
      if (trackingStarted()) { location.reload(); return }
    }
    previousFocus.current?.focus()
  }
  if (!ready || !open) return null
  return <section className="cookie-panel" ref={panel} tabIndex={-1} aria-labelledby="cookie-title" aria-describedby="cookie-description">
    <div className="cookie-copy"><h2 id="cookie-title">Ти избираш бисквитките</h2>
      <p id="cookie-description">Необходимите бисквитки пазят входа и избора ти. Съгласието управлява подробната статистика и рекламните инструменти. Обобщените броячи на каталога работят без бисквитки и без идентификатор на посетител. Можеш да промениш избора си по всяко време.</p>
      <a href="/zashtita-na-lichni-danni#site-cookies">Повече за данните и бисквитките</a>
    </div>
    {details && <div className="cookie-options">
      <p><strong>Необходими — винаги включени.</strong> Вход, сигурност и запазени предпочитания. Изборът за бисквитките се пази {consentLifetime / 86400} дни.</p>
      <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /><span><strong>Статистика</strong><small>Подробна история на търсенията и разгледаните автомобили, Google Analytics и Microsoft Clarity.</small></span></label>
      <label><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} /><span><strong>Реклама</strong><small>Meta Pixel/CAPI и Google Ads. При запитване CAPI може да изпрати защитени с хеш имейл и телефон към Meta за измерване на рекламите.</small></span></label>
      {config.installation === 'gtm' && <p>Tag Manager се зарежда само когато и двете категории са разрешени.</p>}
    </div>}
    <div className="cookie-actions">
      <button type="button" onClick={() => save(false, false, 'necessary_only')}>Само необходимите</button>
      <button type="button" onClick={() => save(true, true, 'accept_all')}>Приеми всички</button>
      {details ? <button type="button" onClick={() => save(analytics, marketing, 'save_preferences')}>Запази избора</button> : <button type="button" onClick={() => setDetails(true)}>Избери настройки</button>}
      {consent && <button type="button" onClick={() => { setOpen(false); previousFocus.current?.focus() }}>Затвори</button>}
    </div>
  </section>
}
