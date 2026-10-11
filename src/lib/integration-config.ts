export type IntegrationConfig = {
  enabled?: boolean | null; hostname?: string | null; installation?: 'direct' | 'gtm' | null
  gaEnabled?: boolean | null; gaId?: string | null
  adsEnabled?: boolean | null; adsId?: string | null; adsLeadLabel?: string | null
  gtmId?: string | null
  pixelEnabled?: boolean | null; pixelId?: string | null; capiEnabled?: boolean | null
  metaAccessToken?: string | null; metaTestCode?: string | null
  clarityEnabled?: boolean | null; clarityId?: string | null
  googleVerification?: string | null; bingVerification?: string | null; metaVerification?: string | null
}
export type PublicIntegrations = {
  enabled: boolean; hostname: string; installation: 'direct' | 'gtm'
  gaId: string; adsId: string; adsLeadLabel: string; gtmId: string; pixelId: string; clarityId: string
}
export const idPatterns = {
  gaId: /^G-[A-Z0-9]{4,20}$/, adsId: /^AW-\d{5,20}$/, adsLeadLabel: /^[A-Za-z0-9_-]{1,100}$/,
  gtmId: /^GTM-[A-Z0-9]{4,20}$/, pixelId: /^\d{5,25}$/, clarityId: /^[a-z0-9]{5,30}$/,
  googleVerification: /^[A-Za-z0-9_-]{10,200}$/, bingVerification: /^[A-Za-z0-9_-]{10,200}$/,
  metaVerification: /^[A-Za-z0-9_-]{10,200}$/, metaTestCode: /^[A-Za-z0-9_-]{1,100}$/,
}
export function hostMatches(host: string, expected: string) {
  return host.toLowerCase().replace(/^www\./, '') === expected.toLowerCase().replace(/^www\./, '')
}
export function trackingAllowed(config: IntegrationConfig, url: string, preview: boolean) {
  try { return !preview && config.enabled === true && !!config.hostname && hostMatches(new URL(url).hostname, config.hostname) } catch { return false }
}
export function publicIntegrations(config: IntegrationConfig, url: string, preview: boolean): PublicIntegrations {
  const enabled = trackingAllowed(config, url, preview)
  const direct = config.installation !== 'gtm'
  const id = (name: keyof typeof idPatterns, active: boolean) => {
    const value = config[name]
    return enabled && active && typeof value === 'string' && idPatterns[name].test(value) ? value : ''
  }
  return {
    enabled, hostname: config.hostname || '', installation: direct ? 'direct' : 'gtm',
    gaId: id('gaId', direct && !!config.gaEnabled),
    adsId: id('adsId', direct && !!config.adsEnabled), adsLeadLabel: id('adsLeadLabel', direct && !!config.adsEnabled),
    gtmId: id('gtmId', !direct), pixelId: id('pixelId', direct && !!config.pixelEnabled),
    clarityId: id('clarityId', direct && !!config.clarityEnabled),
  }
}
export function privateTrackingPath(path: string) {
  return /^\/(?:admin|api|profil|vhod|registracia|nova-parola|zabravena-parola)(?:\/|$)/.test(path)
}
export function safeTrackingURL(input: string, origin: string) {
  try {
    const url = new URL(input, origin)
    if (url.origin !== new URL(origin).origin || privateTrackingPath(url.pathname)) return new URL('/kontakti', origin).href
    return url.origin + url.pathname
  } catch { return new URL('/kontakti', origin).href }
}
