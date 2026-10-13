// Only confirmed spelling variants of the same brand belong together.
// Keep distinct brands such as Dodge/RAM, Rover/Land Rover and Maybach separate.
const groups = [
 ['MERCEDES-BENZ', 'MERCEDES BENZ', 'MERCEDES'],
 ['ROLLS-ROYCE', 'ROLLS ROYCE'],
 ['HARLEY-DAVIDSON', 'HARLEY DAVIDSON', 'HARLEY'],
 ['CAN-AM', 'CAN AM', 'CANAM'],
 ['CFMOTO', 'CF MOTO'],
 ['ARCTIC CAT', 'ARCTICCAT'],
 ['GASGAS', 'GAS GAS'],
 ['TAO TAO', 'TAOTAO'],
] as const
const key = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const byAlias = new Map<string, readonly string[]>(groups.flatMap(group => group.map(alias => [key(alias), group] as const)))
export function canonicalEridanMake(value: string): string {
 return byAlias.get(key(value))?.[0] || value.trim()
}
export function eridanMakeAliases(value: string): readonly string[] {
 return byAlias.get(key(value)) || [value.trim()]
}
export function sameEridanMake(a: string, b: string): boolean {
 return canonicalEridanMake(a).toUpperCase() === canonicalEridanMake(b).toUpperCase()
}
// CSV is the documented OR query. Never intersect it with an exact make__name.
export function eridanMakeParams(make: string): Record<string, string> {
 const aliases = eridanMakeAliases(make)
 return aliases.length > 1 ? { makes: aliases.join(',') } : { make__name: aliases[0] }
}
