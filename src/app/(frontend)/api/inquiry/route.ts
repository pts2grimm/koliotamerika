import { recordLead } from '@/lib/record-lead'
import { NextResponse, after } from 'next/server'
import { createHmac, randomUUID } from 'node:crypto'
import { cms, siteURL } from '@/lib/data'
import { validateInquiry } from '@/lib/inquiry-validation'
import { customerFromRequest } from '@/lib/account-server'
import { isPreview } from '@/lib/preview'
export async function POST(request: Request) {
 if (isPreview()) return NextResponse.json({ error: 'Запитванията са изключени в демонстрационната версия.' }, { status: 403 })
 const origin = request.headers.get('origin')
 if (origin && origin !== new URL(siteURL()).origin) return NextResponse.json({ error: 'Невалиден източник на заявката.' }, { status: 403 })
 if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Очакват се JSON данни.' }, { status: 415 })
 // Bound streamed input as well as Content-Length to avoid oversized requests.
 const reader = request.body?.getReader(); if (!reader) return NextResponse.json({ error: 'Липсват данни.' }, { status: 400 })
 let size = 0; const chunks: Uint8Array[] = []
 while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); return NextResponse.json({ error: 'Заявката е твърде голяма.' }, { status: 413 }) }; chunks.push(value) }
 let input: unknown
 try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 }) }
 const result = validateInquiry(input)
 if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
 try {
   const payload = await cms()
   // Only trust forwarding headers when a controlled reverse proxy overwrites them.
   const client = process.env.TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'shared'
   const key = createHmac('sha256', process.env.PAYLOAD_SECRET!).update(client).digest('hex')
   const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
   const recent = await payload.count({ collection: 'submission-limits', where: { and: [{ key: { equals: key } }, { createdAt: { greater_than: cutoff } }] } })
   if (recent.totalDocs >= (client === 'shared' ? 30 : 5)) return NextResponse.json({ error: 'Твърде много запитвания. Опитай отново след час.' }, { status: 429, headers: { 'Retry-After': '3600' } })
   const customer = await customerFromRequest(request)
   await payload.create({ collection: 'inquiries', data: { ...result.data, ...(customer ? { customer: customer.id, email: customer.email } : {}) } })
   await payload.create({ collection: 'submission-limits', data: { key } })
   await payload.delete({ collection: 'submission-limits', where: { createdAt: { less_than: cutoff } } })
   const eventId = randomUUID()
   const tracking = (input as { tracking?: { path?: unknown; marketing?: unknown } }).tracking
   // Schedule ONLY after persistence and validation, never from a public arbitrary-event endpoint.
   const lead = { id: eventId, email: customer?.email || result.data.email, phone: result.data.phone,
     path: typeof tracking?.path === 'string' ? tracking.path.slice(0, 2000) : '/kontakti',
     marketing: tracking?.marketing === true, time: Date.now() }
   after(() => recordLead(payload, request, lead))
   return NextResponse.json({ success: true, eventId }, { status: 201 })
 } catch (error) { console.error('Inquiry persistence failed:', error instanceof Error ? error.name : 'Unknown error'); return NextResponse.json({ error: 'Запитването не беше записано. Моля, опитай отново.' }, { status: 500 }) }
}
