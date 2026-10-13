export const cylinderOptions = Array.from({ length: 16 }, (_, index) => String(index + 1))

// Only the explicit provider field is authoritative; never infer this from engine text.
export function cylinderCount(value: unknown): number | undefined {
 const candidate = typeof value === 'string' && /^\d{1,2}$/.test(value.trim()) ? Number(value.trim()) : value
 return typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 1 && candidate <= 16 ? candidate : undefined
}

// IAAI supplies e.g. "4 Cyl"; URL filters remain strictly numeric.
export function providerCylinderCount(value: unknown): number | undefined {
 const match = typeof value === 'string' ? /^(\d{1,2})\s+cyl$/i.exec(value.trim()) : null
 return cylinderCount(match ? match[1] : value)
}
