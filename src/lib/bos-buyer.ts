export const buyerFields = [
  'buyerName', 'buyerAddress', 'buyerCity', 'buyerPostalCode', 'buyerCountry',
  'buyerPhone', 'buyerHomePhone', 'buyerWorkPhone', 'buyerState', 'buyerCounty',
  'buyerLicense', 'buyerDOB', 'buyerLicenseExpiry',
] as const
export type BuyerField = typeof buyerFields[number]
export type SavedBuyer = Partial<Record<BuyerField, string | null>> & { id: number | string; stock?: string }
export function buyerValues(source: SavedBuyer): Record<BuyerField, string> {
  return Object.fromEntries(buyerFields.map(key => [key, typeof source[key] === 'string' ? source[key] : ''])) as Record<BuyerField, string>
}
export function distinctBuyers(docs: SavedBuyer[]): SavedBuyer[] {
  const seen = new Set<string>()
  return docs.filter(doc => {
    const key = JSON.stringify(buyerValues(doc))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export type PostalPlace = { name: string; region: string; municipality: string; codes: string[] }
export const normalized = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('bg')
export function isBulgaria(value: unknown) {
  return ['bg', 'bgr', 'bulgaria', 'българия', 'република българия', 'republic of bulgaria'].includes(normalized(value))
}
const transliteration: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya',
}
const latin = (value: string) => normalized(value).replace(/[а-я]/g, char => transliteration[char] ?? char)
export function searchPlaces(places: PostalPlace[], query: string): PostalPlace[] {
  const q = normalized(query)
  if (q.length < 2) return []
  return places.filter(place => normalized(place.name).includes(q) || latin(place.name.split(' / ')[0]).includes(q) ||
    (q === 'sofia' && place.name.startsWith('София / ')))
    .sort((a, b) => Number(!normalized(a.name).startsWith(q)) - Number(!normalized(b.name).startsWith(q)))
    .slice(0, 15)
}
export function placeName(place: PostalPlace, query: string): string {
  if (/[а-я]/i.test(query)) return place.name.split(' / ')[0]
  if (place.name.startsWith('София / ')) return 'Sofia'
  return place.name.split(' / ')[1] || place.name
}
// The national directory is settlement-level, not a street-address validator.
// Round primary codes are offered for confirmation, never silently used for city districts.
export function automaticPostalCode(place: PostalPlace): string | null {
  return place.codes.length === 1 && !place.codes[0].endsWith('00') ? place.codes[0] : null
}
