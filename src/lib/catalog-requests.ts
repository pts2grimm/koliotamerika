// Operational catalogue-service records. No browser identifiers or raw request objects.
export type CatalogRequestKind = 'search' | 'view' | 'lookup'
export type CatalogRequestInput = { kind: CatalogRequestKind; provider: string; params: URLSearchParams }
export type CatalogRequestSummary = { make?: string; model?: string; lot?: string; site?: string; count?: number }
export type CatalogRequestRecord = {
  createdAt: string; kind: CatalogRequestKind; provider: string; make: string; model: string;
  lot: string; site: string; yearFrom: string; yearTo: string; page: number;
  outcome: 'results' | 'empty' | 'error'; resultCount: number | null; durationMs: number;
}
const label = (value: string | null | undefined) => {
  const text = (value || '').trim().replace(/\s+/g,' ').toUpperCase()
  return text.length <= 100 && /^[A-Z0-9 &+()./-]*$/.test(text) && !/^[A-HJ-NPR-Z0-9]{17}$/.test(text) ? text : ''
}
const digits = (value: string | null | undefined, pattern: RegExp) => value && pattern.test(value) ? value : ''
export function catalogRequestRecord(input: CatalogRequestInput, summary: CatalogRequestSummary, start: number, failed: boolean, end = Date.now()): CatalogRequestRecord {
  const p = input.params
  const count = Number.isSafeInteger(summary.count) && Number(summary.count) >= 0 ? Number(summary.count) : null
  const page = Number(p.get('page') || 1)
  return {
    createdAt: new Date(start).toISOString(), kind: input.kind,
    provider: ['eridan','apicar','legacy'].includes(input.provider) ? input.provider : 'unknown',
    make: label(summary.make || p.get('make')), model: label(summary.model || p.get('model')),
    lot: digits(summary.lot || p.get('lot'), /^\d{5,12}$/),
    site: ['1','2'].includes(summary.site || p.get('site') || '') ? (summary.site || p.get('site'))! : '',
    yearFrom: digits(p.get('year_from'), /^(19|20)\d{2}$/), yearTo: digits(p.get('year_to'), /^(19|20)\d{2}$/),
    page: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
    outcome: failed ? 'error' : count === 0 ? 'empty' : 'results',
    resultCount: failed ? null : count, durationMs: Math.min(3600000, Math.max(0, Math.round(end-start))),
  }
}
// Recording failure must never replace a provider result or its original exception.
export async function runCatalogRequest<T>(
  input: CatalogRequestInput, run: () => Promise<T>,
  describe: (result: T) => CatalogRequestSummary, record: (data: CatalogRequestRecord) => void,
): Promise<T> {
  const start = Date.now()
  let summary: CatalogRequestSummary = {}, failed = true
  try {
    const result = await run()
    failed = false
    try { summary = describe(result) } catch { /* Optional diagnostic description. */ }
    return result
  } finally {
    try { record(catalogRequestRecord(input, summary, start, failed)) } catch { /* Never fail a catalogue request. */ }
  }
}
