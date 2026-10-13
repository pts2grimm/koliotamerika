export const cylinderOptions = Array.from({ length: 16 }, (_, index) => String(index + 1))

// Only the explicit provider field is authoritative; never infer this from engine text.
export function cylinderCount(value: unknown): number | undefined {
 const candidate = typeof value === 'string' && /^\d{1,2}$/.test(value.trim()) ? Number(value.trim()) : value
 return typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 1 && candidate <= 16 ? candidate : undefined
}
