import { createHash } from 'node:crypto'
import type { IntegrationConfig } from './integration-config'
import { idPatterns, safeTrackingURL, trackingAllowed } from './integration-config'
import { consentFromCookies, cookieValue } from './tracking-consent'
import { decryptIntegrationToken } from './integration-secrets'

export const metaAPIVersion = 'v26.0'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function normalizeMetaPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (/^0\d{9}$/.test(digits)) return '359' + digits.slice(1)
  if (/^00\d{7,15}$/.test(digits)) return digits.slice(2)
  if (/^\+/.test(phone.trim()) && /^\d{7,15}$/.test(digits)) return digits
  return undefined
}
export type LeadInput = { id: string; email: string; phone: string; path: string; marketing: boolean; time: number }
export function buildMetaLead(lead: LeadInput, request: Request, origin: string) {
  const cookies = request.headers.get('cookie') || ''
  if (!lead.marketing || !consentFromCookies(cookies)?.marketing || request.headers.get('origin') !== new URL(origin).origin) return null
  const email = lead.email.trim().toLowerCase()
  const phone = normalizeMetaPhone(lead.phone)
  const fbp = cookieValue(cookies, '_fbp')
  const fbc = cookieValue(cookies, '_fbc')
  return {
    event_name: 'Lead', event_id: lead.id, event_time: Math.floor(lead.time / 1000),
    action_source: 'website', event_source_url: safeTrackingURL(lead.path, origin),
    user_data: { em: [hash(email)], ...(phone ? { ph: [hash(phone)] } : {}),
      ...(fbp && /^fb\.\d\.\d{10,16}\.\d{1,30}$/.test(fbp) ? { fbp } : {}),
      ...(fbc && /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_-]{1,500}$/.test(fbc) ? { fbc } : {}),
      ...(request.headers.get('user-agent') ? { client_user_agent: request.headers.get('user-agent')!.slice(0,500) } : {}),
    },
  }
}
export async function sendMetaLead(options: {
  config: IntegrationConfig; lead: LeadInput; request: Request; origin: string; preview: boolean
  fetcher?: typeof fetch; decrypt?: (value: string) => string
}): Promise<'skipped' | 'sent' | 'failed'> {
  const { config, request, origin, preview, lead } = options
  if (!trackingAllowed(config, origin, preview) || !config.capiEnabled || !config.metaAccessToken ||
    !idPatterns.pixelId.test(config.pixelId || '')) return 'skipped'
  const event = buildMetaLead(lead, request, origin)
  if (!event) return 'skipped'
  try {
    const token = (options.decrypt || decryptIntegrationToken)(config.metaAccessToken)
    const body = JSON.stringify({ data: [event], ...(config.metaTestCode ? { test_event_code: config.metaTestCode } : {}) })
    // One bounded retry with the SAME event ID. Credentials never enter URLs or logs.
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await (options.fetcher || fetch)(
        'https://graph.facebook.com/' + metaAPIVersion + '/' + config.pixelId + '/events',
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body, signal: AbortSignal.timeout(4000), cache: 'no-store' },
      )
      if (response.ok) {
        const result = await response.json() as { events_received?: number }
        return result.events_received === 1 ? 'sent' : 'failed'
      }
      await response.body?.cancel()
      if (response.status < 500) return 'failed'
    }
  } catch { /* Caller records only a generic status, never a token or a provider response. */ }
  return 'failed'
}
