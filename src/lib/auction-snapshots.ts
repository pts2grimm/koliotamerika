import type { AuctionCar } from './auction-providers/types'

// A catalogue result already contains the complete normalized Eridan lot.
// Reuse it briefly on navigation without extending its original fetch age.
export function createAuctionSnapshots({ now = Date.now, ttl = 60_000, limit = 256 } = {}) {
 const entries = new Map<string, { car: AuctionCar; fetchedAt: number }>()
 const key = (lot: string, site: string) => site + ':' + lot
 const fresh = (fetchedAt: number) => fetchedAt <= now() && now() - fetchedAt < ttl
 return {
  remember(cars: AuctionCar[], fetchedAt: number) {
   for (const [id, entry] of entries) if (!fresh(entry.fetchedAt)) entries.delete(id)
   if (!fresh(fetchedAt)) return
   for (const car of cars) {
    const id = key(String(car.lot_id), String(car.site))
    const existing = entries.get(id)
    if (existing && existing.fetchedAt >= fetchedAt) continue
    entries.delete(id)
    entries.set(id, { car, fetchedAt })
    while (entries.size > limit) entries.delete(entries.keys().next().value!)
   }
  },
  get(lot: string, site: string) {
   const id = key(lot, site), entry = entries.get(id)
   if (!entry) return undefined
   if (!fresh(entry.fetchedAt)) { entries.delete(id); return undefined }
   return entry.car
  },
 }
}
