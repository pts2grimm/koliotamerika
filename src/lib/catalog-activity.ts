import { readAuctionFilters } from './auction-filters'

export const catalogRetentionDays = 90
export const catalogReceiptKey = 'koa-catalog-session'
export type CatalogActivity = {
  kind: 'search' | 'view'; section: 'cars' | 'powersports'; archive: boolean
  make?: string; model?: string; yearFrom?: string; yearTo?: string
  lot?: string; site?: string; vin?: string; query?: string
  resultCount?: number; outcome?: 'results' | 'empty' | 'error'
  filters?: Record<string, string>
}
const cleanText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length <= max &&
  !/[\u0000-\u001f\u007f<>]/.test(value) ? value.trim() : null
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
export function validateCatalogActivity(value: unknown): { event: string; receipt: string; data: CatalogActivity } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (Object.keys(input).some(k => !['event','receipt','data'].includes(k)) || !uuid(input.event) || !uuid(input.receipt)) return null
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return null
  const d = input.data as Record<string, unknown>
  if (Object.keys(d).some(k => !['kind','section','archive','make','model','yearFrom','yearTo','lot','site','vin','query','resultCount','outcome','filters'].includes(k))) return null
  if (typeof d.kind !== 'string' || !['search','view'].includes(d.kind) || typeof d.section !== 'string' || !['cars','powersports'].includes(d.section) || typeof d.archive !== 'boolean') return null
  const data: CatalogActivity = { kind: d.kind as CatalogActivity['kind'], section: d.section as CatalogActivity['section'], archive: d.archive }
  for (const key of ['make','model'] as const) {
    if (d[key] === undefined) continue
    const text = cleanText(d[key], 100)
    if (text === null) return null
    if (text) data[key] = text
  }
  for (const key of ['yearFrom','yearTo'] as const) {
    if (d[key] === undefined || d[key] === '') continue
    if (typeof d[key] !== 'string' || !/^(19|20)\d{2}$|^2100$/.test(d[key])) return null
    data[key] = d[key]
  }
  for (const key of ['lot','site','vin','query'] as const) {
    if (d[key] === undefined || d[key] === '') continue
    if (typeof d[key] !== 'string') return null
    const text = d[key].trim().toUpperCase()
    const pattern = key === 'lot' ? /^\d{1,12}$/ : key === 'site' ? /^[12]$/ : key === 'vin' ? /^[A-HJ-NPR-Z0-9]{17}$/ : /^(?:\d{6,12}|[A-HJ-NPR-Z0-9]{17})$/
    if (!pattern.test(text)) return null
    data[key] = text
  }
  if (data.kind === 'view' && (!data.lot || !data.site)) return null
  if (d.resultCount !== undefined) {
    if (typeof d.resultCount !== 'number' || !Number.isSafeInteger(d.resultCount) || d.resultCount < 0 || d.resultCount > 100000000) return null
    data.resultCount = d.resultCount
  }
  if (d.outcome !== undefined) {
    if (typeof d.outcome !== 'string' || !['results','empty','error'].includes(d.outcome)) return null
    data.outcome = d.outcome as CatalogActivity['outcome']
  }
  if (d.filters !== undefined) {
    if (!d.filters || typeof d.filters !== 'object' || Array.isArray(d.filters)) return null
    const filters = d.filters as Record<string, unknown>
    // Seller names and arbitrary URL parameters are deliberately not stored.
    const allowed = ['make','model','year_from','year_to','status','site','fuel','seller_type','vehicle_type','cylinders','sort']
    if (Object.keys(filters).some(k => !allowed.includes(k) || cleanText(filters[k], 100) === null)) return null
    data.filters = readAuctionFilters(filters as Record<string, string>)
  }
  return { event: input.event, receipt: input.receipt, data }
}
