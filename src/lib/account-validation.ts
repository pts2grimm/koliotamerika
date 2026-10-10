export type SavedVehicle = { kind: 'auction'; lot: string; site: string; title: string } | { kind: 'car'; slug: string; title: string }
export function vehicleInput(value: unknown): SavedVehicle | null {
 if (!value || typeof value !== 'object') return null
 const v = value as Record<string, unknown>
 if (typeof v.title !== 'string' || !v.title.trim() || v.title.length > 200) return null
 const title = v.title.trim()
 if ((v.kind === 'auction' || !v.kind) && typeof v.lot === 'string' && /^\d{5,12}$/.test(v.lot) && (v.site === '1' || v.site === '2')) return { kind: 'auction', lot: v.lot, site: v.site, title }
 if (v.kind === 'car' && typeof v.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug) && v.slug.length <= 180) return { kind: 'car', slug: v.slug, title }
 return null
}
export const vehicleKey = (v: SavedVehicle) => v.kind === 'car' ? `car:${v.slug}` : `auction:${v.site}:${v.lot}`
export const vehicleURL = (v: SavedVehicle) => v.kind === 'car' ? `/avtomobili/${v.slug}` : `/targove/kola?lot=${v.lot}&site=${v.site}`
export { validPassword } from './password-policy'
export const accountEmail = (v: unknown) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? v.trim().toLowerCase() : null
