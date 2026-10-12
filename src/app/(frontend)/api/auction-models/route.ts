import { auctionModels } from '@/lib/auctions'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
 const params = new URL(request.url).searchParams
 const make = params.get('make')?.trim()
 const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
 if (!make || make.length > 100 || params.getAll('make').length !== 1) return Response.json({ error: 'Невалидна марка.' }, { status: 400, headers })
 try { return Response.json({ models: await auctionModels(make) }, { headers }) }
 catch { return Response.json({ error: 'Моделите временно не са достъпни.' }, { status: 503, headers }) }
}
