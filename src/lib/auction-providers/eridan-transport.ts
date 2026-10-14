import type { AuctionTransport } from './types'

type Fetcher = (url: URL, init: RequestInit) => Promise<{
 ok: boolean; status: number; json(): Promise<unknown>; body?: { cancel(): Promise<unknown> } | null
 headers?: { get(name: string): string | null }
}>
type Options = { apiKey?: string; fetch: Fetcher; now?: () => number; testBaseURL?: string; timeoutMs?: number }
const baseURL = 'https://catalog.eridan.software/api'
const paths = new Set(['/lots', '/makes', '/models', '/item_types', '/fuel_types'])

export function createEridanTransport(options: Options): AuctionTransport {
 const now = options.now || Date.now
 let blockedUntil = 0, active = 0
 const waiting = new Set<() => void>()
 let base = baseURL
 if (options.testBaseURL) {
  const url = new URL(options.testBaseURL)
  // Local browser fixture only. A real credential can never be sent to an override host.
  if (options.apiKey !== 'eridan-local-fixture' || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid Eridan test transport')
  base = url.origin
 }
 // Bound upstream concurrency across searches AND directories, without imposing an
 // undocumented per-minute quota on all visitors. Waiting uses the same deadline.
 const acquire = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const abort = () => {
   waiting.delete(grant)
   reject(new Error('Eridan request timed out'))
  }
  const grant = () => {
   signal.removeEventListener('abort', abort)
   active++
   resolve()
  }
  if (signal.aborted) return abort()
  if (active < 2) return grant()
  waiting.add(grant)
  signal.addEventListener('abort', abort, { once: true })
 })
 const release = () => {
  active--
  const next = waiting.values().next().value
  if (next) { waiting.delete(next); next() }
 }
 const checkPause = () => {
  if (now() < blockedUntil) throw new Error('Eridan is temporarily paused after an access or rate limit error')
 }
 const retryDelay = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(new Error('Eridan request timed out')) }
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 250)
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
 })
 return async (path, params) => {
  if (!options.apiKey?.trim()) throw new Error('ERIDAN_API_KEY is missing')
  if (!paths.has(path)) throw new Error('Unsupported Eridan operation')
  checkPause()
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15000)
  await acquire(signal)
  try {
   const url = new URL(base + path); url.search = params.toString()
   for (let attempt = 0; attempt < 2; attempt++) {
    // Another in-flight request may have received 401/403/429 while we waited.
    checkPause()
    if (signal.aborted) throw new Error('Eridan request timed out')
    let response
    try {
     response = await options.fetch(url, {
      method: 'GET', redirect: 'error', signal,
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + options.apiKey.trim() },
     })
    } catch {
     if (signal.aborted) throw new Error('Eridan request timed out')
     if (attempt === 0) { await retryDelay(signal); continue }
     throw new Error('Eridan connection failed')
    }
    if (!response.ok) {
     if (response.status === 401 || response.status === 403) blockedUntil = Math.max(blockedUntil, now() + 30 * 60000)
     if (response.status === 429) {
      const value = response.headers?.get('retry-after')?.trim()
      const delay = value && /^\d+(\.\d+)?$/.test(value)
       ? Number(value) * 1000
       : value ? Date.parse(value) - now() : NaN
      blockedUntil = Math.max(blockedUntil, now() + (Number.isFinite(delay) && delay > 0 ? delay : 60000))
     }
     try { await response.body?.cancel() } catch { /* Never expose upstream bodies. */ }
     if (attempt === 0 && [502, 503, 504].includes(response.status)) { await retryDelay(signal); continue }
     throw new Error('Auction provider HTTP ' + response.status)
    }
    try { return await response.json() } catch {
     throw new Error(signal.aborted ? 'Eridan request timed out' : 'Invalid Eridan JSON response')
    }
   }
   throw new Error('Eridan connection failed')
  } finally { release() }
 }
}
