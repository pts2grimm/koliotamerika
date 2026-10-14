import { readAuctionFilters, type AuctionQuery } from './auction-filters'

export type AuctionSection = 'cars' | 'powersports'
export const powersportsPath = '/targove/motori-atv'
export function auctionSectionPath(section: AuctionSection, archive = false) {
 return (section === 'powersports' ? powersportsPath : '/targove') + (archive ? '/arhiv' : '')
}
export function sectionVehicleType(section: AuctionSection, selected?: string) {
 return section === 'cars' ? 'Automobile' : selected === 'Motorcycle' || selected === 'ATVUTV' ? selected : 'Powersports'
}
export function sectionFilters(input: AuctionQuery, section: AuctionSection) {
 const filters = readAuctionFilters(input)
 if (section === 'cars' || !['Motorcycle', 'ATVUTV'].includes(filters.vehicle_type)) delete filters.vehicle_type
 return filters
}
// Preserve bookmarked category searches, including pagination and lot queries.
export function auctionSectionRedirect(input: AuctionQuery, section: AuctionSection, archive = false) {
 const type = readAuctionFilters(input).vehicle_type
 const target = section === 'cars' && ['Motorcycle','ATVUTV','Powersports'].includes(type) ? 'powersports'
  : section === 'powersports' && type === 'Automobile' ? 'cars' : null
 if (!target) return null
 const params = new URLSearchParams()
 for (const [key,value] of Object.entries(input)) {
  const last = Array.isArray(value) ? value.at(-1) : value
  if (typeof last === 'string' && last && !(key === 'vehicle_type' && ['Automobile','Powersports'].includes(last))) params.set(key,last)
 }
 const path = auctionSectionPath(target,archive)
 return params.size ? path + '?' + params : path
}
