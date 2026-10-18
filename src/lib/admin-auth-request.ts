import type { Payload } from 'payload'
import { requestLimitIdentity, reserveSubmission } from './submission-limit'

const reply = (status: number, error: string) => Response.json({ errors: [{ message: error }] }, {
  status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) },
})

/** Bound public admin authentication before Payload hashes passwords or sends mail.
 * Keep authenticated CMS writes/uploads and internal Local API operations separate.
 */
export async function guardAdminAuth(request: Request, action: string, getPayload: () => Promise<Payload>) {
  const origin = request.headers.get('origin')
  const expected = new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').origin
  if (request.headers.get('sec-fetch-site') === 'cross-site' || origin && origin !== expected) return reply(403, 'Невалиден източник на заявката.')
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415, 'Очакват се JSON данни.')
  const reader = request.body?.getReader()
  if (!reader) return reply(400, 'Липсват данни.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 16384) { await reader.cancel(); return reply(413, 'Заявката е твърде голяма.') }
      chunks.push(value)
    }
  } catch { return reply(400, 'Невалидни данни.') }
  const text = Buffer.concat(chunks).toString('utf8')
  let data: Record<string, unknown>
  try {
    const input = JSON.parse(text)
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, 'Невалидни данни.')
    data = input
  } catch { return reply(400, 'Невалидни данни.') }
  if (data.email != null && (typeof data.email !== 'string' || data.email.length > 254)
    || data.password != null && (typeof data.password !== 'string' || data.password.length > 128)
    || data.token != null && (typeof data.token !== 'string' || data.token.length > 256)) return reply(400, 'Невалидни данни.')
  try {
    const payload = await getPayload()
    const identity = requestLimitIdentity(request.headers)
    const limits: [string, number][] = [[`admin:${action}:ip:${identity}`, identity === 'shared' ? 120 : 30]]
    if (typeof data.email === 'string' && data.email.trim()) limits.push([`admin:${action}:email:${data.email.trim().toLowerCase()}`, action === 'forgot-password' ? 5 : 15])
    for (const [key, limit] of limits) if (!await reserveSubmission(payload, key, limit)) return reply(429, 'Твърде много опити. Опитай отново след час.')
  } catch {
    console.warn('Admin authentication protection unavailable.')
    return reply(503, 'Входът временно не е достъпен. Опитай отново.')
  }
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  return new Request(request.url, { method: request.method, headers, body: text })
}
