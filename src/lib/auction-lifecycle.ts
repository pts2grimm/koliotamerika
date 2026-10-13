import { parseAuctionDate } from './auction-schedule'
export function isAuctionClosed(car: { auction_status?: string; auction_date?: string }, now = Date.now()) {
 if (!car.auction_status) return false // Other providers have no Eridan lifecycle contract.
 const date = parseAuctionDate(car.auction_date)
 return car.auction_status === 'sold' || date !== null && date <= now
}
export function archivedAuctionLabel(car: { auction_status?: string }) {
 return car.auction_status === 'sold' ? 'Продаден' : 'Търгът е минал'
}
