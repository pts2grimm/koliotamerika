export const contactPhone = '+359 884 478 885'
export const contactPhoneHref = '+359884478885'
// Match only the retired Bulgarian business number, including common display formats.
// Do not match it as part of a longer identifier.
const oldPhone = /(?<![\d+])(?:\+359[\s().-]*|00359[\s().-]*|0)8[\s().-]*8[\s().-]*8[\s().-]*2[\s().-]*9[\s().-]*2[\s().-]*2[\s().-]*8[\s().-]*0(?!\d)/g
export function replaceContactPhone(value: string): string {
 return value.replace(oldPhone, (match, offset) =>
  /(?:tel:|sms:)$/i.test(value.slice(0, offset)) ? contactPhoneHref : contactPhone)
}
const identifiers = new Set(['id','image','heroImage','relationTo','value','slug','legacyImage','sourceURL','createdAt','updatedAt','publishedAt','status','initialized'])
/** Copy public text and link fields without changing IDs, media or publication state. */
export function contactPhoneCopy<T>(value: T): T {
 if (typeof value === 'string') return replaceContactPhone(value) as T
 if (Array.isArray(value)) return value.map(contactPhoneCopy) as T
 if (value && typeof value === 'object') return Object.fromEntries(
  Object.entries(value).map(([key, item]) => [key, identifiers.has(key) ? item : contactPhoneCopy(item)])
 ) as T
 return value
}
export function contactPhonePatch<T extends object>(record: T, fields: readonly (keyof T)[]): Partial<T> {
 const patch: Partial<T> = {}
 for (const field of fields) {
  const next = contactPhoneCopy(record[field])
  if (JSON.stringify(next) !== JSON.stringify(record[field])) patch[field] = next
 }
 return patch
}
