import { cms } from '@/lib/data'
import { InvoiceLayoutError, createInvoicePDF } from '@/lib/invoice-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive' }
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  if (user?.collection !== 'users') return Response.json({ error: 'Необходим е администраторски вход.' }, { status: 403, headers })
  const { id } = await context.params
  if (!/^[1-9][0-9]{0,9}$/.test(id)) return Response.json({ error: 'Невалиден документ.' }, { status: 400, headers })
  const result = await payload.find({ collection: 'invoices', user, overrideAccess: false, depth: 0, limit: 1, where: { id: { equals: Number(id) } } })
  const doc = result.docs[0]
  if (!doc) return Response.json({ error: 'Документът не е намерен.' }, { status: 404, headers })
  try {
    const bytes = await createInvoicePDF(doc)
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Invoice_' + doc.invoiceNumber.replace(/[^A-Z0-9_-]/g, '_') + '.pdf"' } })
  } catch (error) {
    if (error instanceof InvoiceLayoutError) return Response.json({ error: error.message }, { status: 422, headers })
    throw error
  }
}
