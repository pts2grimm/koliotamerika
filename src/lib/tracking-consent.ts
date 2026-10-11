export const consentCookie = 'koa-consent'
export const consentLifetime = 180 * 24 * 60 * 60
export type Consent = { version: 1; analytics: boolean; marketing: boolean; updatedAt: number }
export function parseConsent(value: string | undefined, now = Date.now()): Consent | null {
  try {
    const data = JSON.parse(decodeURIComponent(value || ''))
    if (data.version !== 1 || typeof data.analytics !== 'boolean' || typeof data.marketing !== 'boolean' ||
      !Number.isFinite(data.updatedAt) || data.updatedAt > now + 60000 || data.updatedAt < now - consentLifetime * 1000) return null
    return { version: 1, analytics: data.analytics, marketing: data.marketing, updatedAt: data.updatedAt }
  } catch { return null }
}
export function cookieValue(cookies: string, name: string) {
  return cookies.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1)
}
export function consentFromCookies(cookies: string) { return parseConsent(cookieValue(cookies, consentCookie)) }
export function googleConsent(consent: Pick<Consent, 'analytics' | 'marketing'>) {
  return { analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied', ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied' }
}
