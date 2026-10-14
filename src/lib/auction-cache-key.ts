import { catalogueSort } from './auction-sorting'
import { canonicalEridanMake } from './auction-providers/make-aliases'

// Normalize only equivalent Eridan inputs. Keep every effective filter, and keep
// invalid values for the provider to reject rather than broadening the search.
export function canonicalEridanSearch(raw: string) {
 const input = new URLSearchParams(raw), output = new URLSearchParams()
 for (const key of new Set(input.keys())) {
  const value = input.get(key)!
  if (value !== '') output.set(key, value)
 }
 for (const key of ['make','model','status','fuel','seller','seller_type','vehicle_type','cylinders']) {
  const value = output.get(key)?.trim()
  if (value) output.set(key, value)
  else output.delete(key)
 }
 if (output.has('make')) output.set('make', canonicalEridanMake(output.get('make')!))
 const sites = output.get('site') || '1'
 if (sites.split(',').every(site => site === '1' || site === '2')) output.set('site', [...new Set(sites.split(','))].sort().join(','))
 for (const [key, fallback, minimum, maximum] of [['page',1,1,10000],['size',12,6,24]] as const) {
  output.set(key, String(Math.max(minimum, Math.min(maximum, Math.floor(Number(output.get(key)) || fallback)))))
 }
 if (output.get('archive') === 'sold') output.set('archive','ended')
 output.set('sort', catalogueSort(output.get('sort')))
 output.sort()
 return output.toString()
}
