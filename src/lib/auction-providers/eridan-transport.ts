import type { AuctionTransport } from './types'

type Fetcher = (url: URL, init: RequestInit) => Promise<{
 ok: boolean; status: number; json(): Promise<unknown>; body?: { cancel(): Promise<unknown> } | null
}>
type Options = { apiKey?: string; fetch: Fetcher; now?: () => number; testBaseURL?: string }
const baseURL = 'https://catalog.eridan.software/api'
const paths = new Set(['/lots', '/makes', '/models', '/item_types', '/fuel_types'])

export function createEridanTransport(options: Options): AuctionTransport {
 const now = options.now || Date.now
 let blockedUntil = 0, windowStart = 0, requests = 0
 let base = baseURL
 if (options.testBaseURL) {
  const url = new URL(options.testBaseURL)
  // Local browser fixture only. A real credential can never be sent to an override host.
  if (options.apiKey !== 'eridan-local-fixture' || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid Eridan test transport')
  base = url.origin
 }
 return async (path, params) => {
  if (!options.apiKey?.trim()) throw new Error('ERIDAN_API_KEY is missing')
  if (!paths.has(path)) throw new Error('Unsupported Eridan operation')
  if (now() < blockedUntil) throw new Error('Eridan is temporarily paused after an access or rate limit error')
  if (now() - windowStart >= 60000) { windowStart = now(); requests = 0 }
  if (requests >= 20) throw new Error('Eridan local request budget reached')
  requests++
  const url = new URL(base + path); url.search = params.toString()
  let response
  try {
   response = await options.fetch(url, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + options.apiKey.trim() },
   })
  } catch { throw new Error('Eridan connection failed') }
  if (!response.ok) {
   if ([401, 403, 429].includes(response.status)) blockedUntil = now() + (response.status === 429 ? 60000 : 30 * 60000)
   await response.body?.cancel()
   throw new Error('Auction provider HTTP ' + response.status)
  }
  try { return await response.json() } catch { throw new Error('Invalid Eridan JSON response') }
 }
}
