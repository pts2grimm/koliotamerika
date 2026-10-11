import { hostMatches, privateTrackingPath, safeTrackingURL, type PublicIntegrations } from './integration-config'
import { consentCookie, consentFromCookies, consentLifetime, googleConsent, type Consent } from './tracking-consent'

type Queue = ((...args: unknown[]) => void) & { queue?: unknown[]; q?: unknown[]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: Queue }
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Queue; _fbq?: Queue; clarity?: Queue }
}
let initialized = false
let googleLoaded = false
let gtmLoaded = false
let pixelLoaded = false
let clarityLoaded = false
const configuredGoogle = new Set<string>()
const lastPage = new Map<string, string>()
const leads = new Set<string>()

export const browserConsent = () => consentFromCookies(document.cookie)
export function storeConsent(choice: Pick<Consent, 'analytics' | 'marketing'>) {
  const consent: Consent = { version: 1, ...choice, updatedAt: Date.now() }
  const value = encodeURIComponent(JSON.stringify(consent))
  document.cookie = consentCookie + '=' + value + '; Path=/; SameSite=Lax; Max-Age=' + consentLifetime + (location.protocol === 'https:' ? '; Secure' : '')
  try { localStorage.setItem(consentCookie, value) } catch { /* Cookies still preserve the choice. */ }
  return consent
}
function script(id: string, src: string) {
  if (document.getElementById(id)) return
  const element = document.createElement('script')
  element.id = id; element.src = src; element.async = true
  document.head.append(element)
}
function initGoogle() {
  if (initialized) return
  initialized = true
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments) }
  window.gtag('consent', 'default', googleConsent({ analytics: false, marketing: false }))
  window.gtag('set', 'ads_data_redaction', true)
  window.gtag('js', new Date())
}
function queuedFunction(key: 'fbq' | 'clarity'): Queue {
  if (window[key]) return window[key]!
  const fn: Queue = function (...args) { if (fn.callMethod) fn.callMethod(...args); else (key === 'clarity' ? fn.q! : fn.queue!).push(args) }
  fn.queue = []; fn.q = []
  window[key] = fn
  return fn
}
export function trackingStarted() { return googleLoaded || gtmLoaded || pixelLoaded || clarityLoaded }
export function permitted(config: PublicIntegrations, path: string) {
  return config.enabled && hostMatches(location.hostname, config.hostname) && !privateTrackingPath(path)
}
export function syncTracking(config: PublicIntegrations, consent: Consent, path: string) {
  if (!permitted(config, path)) return
  initGoogle()
  window.gtag!('consent', 'update', googleConsent(consent))
  if (config.installation === 'gtm') {
    // A container can contain arbitrary tags. Require BOTH categories before loading it.
    if (consent.analytics && consent.marketing && config.gtmId && !gtmLoaded) {
      gtmLoaded = true
      window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      script('koa-gtm', 'https://www.googletagmanager.com/gtm.js?id=' + config.gtmId)
    }
    return
  }
  const ids = [consent.analytics ? config.gaId : '', consent.marketing ? config.adsId : ''].filter(Boolean)
  for (const id of ids) if (!configuredGoogle.has(id)) {
    configuredGoogle.add(id)
    window.gtag!('config', id, { send_page_view: false, allow_google_signals: consent.marketing,
      allow_ad_personalization_signals: consent.marketing, page_location: safeTrackingURL(path, location.origin) })
  }
  if (ids.length && !googleLoaded) {
    googleLoaded = true
    script('koa-google', 'https://www.googletagmanager.com/gtag/js?id=' + ids[0])
  }
  if (consent.marketing && config.pixelId && !pixelLoaded) {
    pixelLoaded = true
    const fbq = queuedFunction('fbq')
    window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'
    fbq('consent', 'grant')
    fbq('set', 'autoConfig', false, config.pixelId)
    fbq('init', config.pixelId)
    script('koa-meta', 'https://connect.facebook.net/en_US/fbevents.js')
  }
  if (consent.analytics && config.clarityId) {
    const clarity = queuedFunction('clarity')
    clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: consent.marketing ? 'granted' : 'denied' })
    if (!clarityLoaded) { clarityLoaded = true; script('koa-clarity', 'https://www.clarity.ms/tag/' + config.clarityId) }
  }
}
export function trackPage(config: PublicIntegrations, path: string) {
  const consent = browserConsent()
  if (!consent || !permitted(config, path)) return
  const page_location = safeTrackingURL(path, location.origin)
  const once = (provider: string, send: () => void) => {
    if (lastPage.get(provider) === page_location) return
    const previous = lastPage.get(provider)
    lastPage.set(provider, page_location)
    send()
    return previous
  }
  if (config.installation === 'gtm') {
    if (gtmLoaded && consent.analytics && consent.marketing) once('gtm', () => window.dataLayer!.push({ event: 'koa_page_view', page_location, page_path: path }))
    return
  }
  if (consent.analytics && config.gaId) {
    const page_referrer = lastPage.get('ga') || ''
    once('ga', () => window.gtag?.('event', 'page_view', { send_to: config.gaId, page_location, page_referrer, page_title: document.title }))
  }
  if (consent.marketing && config.pixelId) once('meta', () => window.fbq?.('track', 'PageView'))
}
export function trackLead(config: PublicIntegrations, eventId: string) {
  const consent = browserConsent()
  if (!consent || !permitted(config, location.pathname) || !/^[a-f0-9-]{36}$/.test(eventId) || leads.has(eventId)) return
  leads.add(eventId)
  if (config.installation === 'gtm') {
    if (gtmLoaded && consent.analytics && consent.marketing) window.dataLayer!.push({ event: 'koa_lead', event_id: eventId })
    return
  }
  if (consent.analytics && config.gaId) window.gtag?.('event', 'generate_lead', { send_to: config.gaId, event_id: eventId })
  if (consent.marketing && config.adsId && config.adsLeadLabel) window.gtag?.('event', 'conversion', {
    send_to: config.adsId + '/' + config.adsLeadLabel, transaction_id: eventId,
  })
  if (consent.marketing && config.pixelId) window.fbq?.('track', 'Lead', {}, { eventID: eventId })
}
export function trackContact(config: PublicIntegrations, method: 'phone' | 'email' | 'viber') {
  const consent = browserConsent()
  if (!consent?.analytics || !permitted(config, location.pathname)) return
  if (config.installation === 'gtm') {
    if (gtmLoaded && consent.marketing) window.dataLayer!.push({ event: 'koa_contact_click', contact_method: method })
  } else if (config.gaId) window.gtag?.('event', 'contact_click', { send_to: config.gaId, contact_method: method })
}
export function withdrawTracking(choice: Pick<Consent, 'analytics' | 'marketing'>) {
  window.gtag?.('consent', 'update', googleConsent(choice))
  if (!choice.marketing) window.fbq?.('consent', 'revoke')
  window.clarity?.('consentv2', { analytics_Storage: choice.analytics ? 'granted' : 'denied', ad_Storage: choice.marketing ? 'granted' : 'denied' })
  const names = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(name =>
    (!choice.analytics && /^(?:_ga(?:_|$)|_gid$|_gat|_clck$|_clsk$)/.test(name)) ||
    (!choice.marketing && /^(?:_fbp$|_fbc$|_gcl_)/.test(name)))
  const parts = location.hostname.split('.')
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.'))]
  const pathParts = location.pathname.split('/')
  const paths = new Set(['/', ...pathParts.map((_, i) => pathParts.slice(0, i + 1).join('/') || '/')])
  for (const name of names) for (const domain of domains) for (const path of paths) {
    document.cookie = name + '=; Max-Age=0; Path=' + path + (domain ? '; Domain=' + domain : '')
  }
}
export function notifyLead(eventId: unknown) {
  if (typeof eventId === 'string') window.dispatchEvent(new CustomEvent('koa:lead', { detail: eventId }))
}
