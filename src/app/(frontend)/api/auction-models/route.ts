import { eridanRoadTypes, type EridanRoadType } from '@/lib/auction-providers/eridan-scope'
import { auctionModels } from '@/lib/auctions'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
 const params = new URL(request.url).searchParams
 const make = params.get('make')?.trim()
 const vehicleType = params.get('vehicle_type') || ''
 const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
 if (params.getAll('vehicle_type').length > 1 || vehicleType && !eridanRoadTypes.includes(vehicleType as EridanRoadType)) return Response.json({ error: 'Невалиден вид.' }, { status: 400, headers })
 if (!make || make.length > 100 || params.getAll('make').length !== 1) return Response.json({ error: 'Невалидна марка.' }, { status: 400, headers })
 try { return Response.json({ models: await auctionModels(make, vehicleType) }, { headers }) }
 catch { return Response.json({ error: 'Моделите временно не са достъпни.' }, { status: 503, headers }) }
}
