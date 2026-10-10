import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cms, siteURL } from './data'
import { accountsEnabled } from './accounts-enabled'
export const customerCookie = 'koa-customer'
export class AccountError extends Error { constructor(message: string, public status = 400) { super(message) } }
export async function customerFromRequest(request: Request) {
 if (!accountsEnabled()) return null
 const token = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${customerCookie}=`))?.slice(customerCookie.length + 1)
 if (!token || token.length > 8192) return null
 const payload = await cms()
 const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })
 return user?.collection === 'customers' ? user : null
}
export function accountResponse(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } }) }
export function setCustomerCookie(response: NextResponse, token: string, exp?: number) {
 response.cookies.set(customerCookie, token, { httpOnly: true, secure: new URL(siteURL()).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: token ? Math.max(0, Math.floor((exp || Date.now() / 1000 + 604800) - Date.now() / 1000)) : 0 })
 return response
}
export async function accountBody(request: Request): Promise<Record<string, unknown>> {
 if (!accountsEnabled()) throw new AccountError('Акаунтите още не са активирани. Можеш да запазваш коли на това устройство.', 503)
 if (request.headers.get('origin') !== new URL(siteURL()).origin) throw new AccountError('Невалиден източник на заявката.', 403)
 if (!request.headers.get('content-type')?.includes('application/json')) throw new AccountError('Очакват се JSON данни.', 415)
 const reader = request.body?.getReader(); if (!reader) throw new AccountError('Липсват данни.')
 let size = 0; const chunks: Uint8Array[] = []
 while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 32768) { await reader.cancel(); throw new AccountError('Заявката е твърде голяма.', 413) }; chunks.push(value) }
 try { const data = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (data && typeof data === 'object' && !Array.isArray(data)) return data } catch { /* handled below */ }
 throw new AccountError('Невалидни данни.')
}
export async function accountLimit(request: Request, action: string, email?: string) {
 const payload = await cms()
 const client = process.env.TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'shared'
 const cutoff = new Date(Date.now() - 3600000).toISOString()
 const limits: [string, number][] = [[`account:${action}:ip:${client}`, client === 'shared' ? 120 : 30]]
 if (email) limits.push([`account:${action}:email:${email}`, action === 'forgot' ? 5 : 15])
 for (const [value, max] of limits) {
  const key = createHmac('sha256', process.env.PAYLOAD_SECRET!).update(value).digest('hex')
  const recent = await payload.count({ collection: 'submission-limits', where: { and: [{ key: { equals: key } }, { createdAt: { greater_than: cutoff } }] } })
  if (recent.totalDocs >= max) throw new AccountError('Твърде много опити. Опитай отново след час.', 429)
  await payload.create({ collection: 'submission-limits', data: { key } })
 }
 await payload.delete({ collection: 'submission-limits', where: { createdAt: { less_than: cutoff } } })
}
