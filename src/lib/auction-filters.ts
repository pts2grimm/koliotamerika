import { auctionSort } from './auction-sorting'
export const auctionFilterKeys = ['make', 'model', 'year_from', 'year_to', 'status', 'site', 'fuel', 'seller_type', 'seller', 'vehicle_type', 'sort'] as const
export type AuctionQuery = Record<string, string | string[] | undefined>

export function readAuctionFilters(input: AuctionQuery) {
  const filters: Record<string, string> = {}
  for (const key of auctionFilterKeys) {
    const raw = Array.isArray(input[key]) ? input[key].at(-1) : input[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (value && value.length <= 100) filters[key] = value
  }
  const sort = auctionSort(filters.sort).value
  if (sort) filters.sort = sort; else delete filters.sort
  if (!filters.make) delete filters.model
  if (filters.site === '1,2' || filters.site === '2,1') delete filters.site
  return filters
}

export function auctionFilterLabel(key: string, value: string) {
  const labels: Record<string, Record<string, string>> = {
    vehicle_type: { Automobile: 'Автомобили', Motorcycle: 'Мотоциклети', ATVUTV: 'ATV и UTV' },
    site: { '1': 'Copart', '2': 'IAAI' },
    fuel: { Gasoline: 'Бензин', Diesel: 'Дизел', Hybrid: 'Хибрид', Electric: 'Електрически' },
    status: { 'Run & Drive': 'Движи се', Starts: 'Запалва', Stationary: 'Не се движи', 'Enhanced Vehicles': 'Enhanced Vehicles', "Can't test": 'Не е тестван' },
    seller_type: { insurance: 'Застраховател', dealer: 'Частно лице' },
  }
  if (key === 'year_from') return `От ${value} г.`
  if (key === 'year_to') return `До ${value} г.`
  return labels[key]?.[value] || value
}

export function auctionResultsURL(filters: Record<string, string>, page = 1, basePath = '/targove') {
  const params = new URLSearchParams()
  const clean = readAuctionFilters(filters)
  for (const key of auctionFilterKeys) if (clean[key]) params.set(key, clean[key])
  if (page > 1) params.set('pagenum', String(page))
  return params.size ? `${basePath}?${params}` : basePath
}

// A submission replaces the query: no stale lot search/page, empty values or duplicate keys.
export function auctionFormURL(data: FormData, basePath = '/targove') {
  const filters: Record<string, string> = {}
  for (const key of auctionFilterKeys) {
    const value = data.getAll(key).at(-1)
    if (typeof value === 'string') filters[key] = value
  }
  return auctionResultsURL(filters, 1, basePath)
}
