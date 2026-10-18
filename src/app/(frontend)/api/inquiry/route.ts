import { requestLimitIdentity, reserveSubmission } from '@/lib/submission-limit'
import { notifyInquiryBeforeResponse } from '@/lib/inquiry-notification'
import { passwordRecoveryEnabled } from '@/lib/accounts-enabled'
import { recordLead } from '@/lib/record-lead'
import { NextResponse, after } from 'next/server'
import { randomUUID } from 'node:crypto'
import { cms, siteURL } from '@/lib/data'
import { validateInquiry } from '@/lib/inquiry-validation'
import { customerFromRequest } from '@/lib/account-server'
import { isPreview } from '@/lib/preview'
export async function POST(request: Request) {
 if (isPreview()) return NextResponse.json({ error: 'Запитванията са изключени в демонстрационната версия.' }, { status: 403 })
 const origin = request.headers.get('origin')
 if (request.headers.get('sec-fetch-site') === 'cross-site' || origin !== new URL(siteURL()).origin) return NextResponse.json({ error: 'Невалиден източник на заявката.' }, { status: 403 })
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
   const client = requestLimitIdentity(request.headers)
   // Reserve before persistence/mail, including concurrent submissions.
   if (!await reserveSubmission(payload, client, client === 'shared' ? 30 : 5)) return NextResponse.json({ error: 'Твърде много запитвания. Опитай отново след час.' }, { status: 429, headers: { 'Retry-After': '3600', 'Cache-Control': 'no-store' } })
   const customer = await customerFromRequest(request)
   const inquiry = await payload.create({ collection: 'inquiries', data: { ...result.data, ...(customer ? { customer: customer.id, email: customer.email } : {}) } })
   const eventId = randomUUID()
   const tracking = (input as { tracking?: { path?: unknown; marketing?: unknown } }).tracking
   // Schedule ONLY after persistence and validation, never from a public arbitrary-event endpoint.
   const lead = { id: eventId, email: customer?.email || result.data.email, phone: result.data.phone,
     path: typeof tracking?.path === 'string' ? tracking.path.slice(0, 2000) : '/kontakti',
     marketing: tracking?.marketing === true, time: Date.now() }
   // Analytics may run after the response; business mail must start during it.
   try { after(() => recordLead(payload, request, lead)) }
   catch { console.warn('Inquiry analytics scheduling unavailable; inquiry remains saved.') }
   await notifyInquiryBeforeResponse({ ...result.data, id: inquiry.id, email: customer?.email || result.data.email }, {
    enabled: passwordRecoveryEnabled(), siteURL: siteURL(),
    getRecipient: async () => (await payload.findGlobal({ slug: 'site-settings', depth: 0 })).email,
    send: mail => payload.sendEmail(mail),
    // Use stdout/stderr directly: hosted log collectors may not flush Payload's logger.
    warn: message => console.warn(message),
    info: message => console.info(message),
   })
   return NextResponse.json({ success: true, eventId }, { status: 201, headers: { 'X-Inquiry-Handler': 'smtp-awaited-v1', 'Cache-Control': 'no-store' } })
 } catch (error) { console.error('Inquiry persistence failed:', error instanceof Error ? error.name : 'Unknown error'); return NextResponse.json({ error: 'Запитването не беше записано. Моля, опитай отново.' }, { status: 500 }) }
}

// Public version marker only; never disclose SMTP configuration or allow GET to send.
export function GET() {
 return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store', 'X-Inquiry-Handler': 'smtp-awaited-v1' } })
}
