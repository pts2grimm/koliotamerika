export const bosSeller = {
  name: 'HWY 17 AUTO SALES', address: '5116 OGEECHEE RD',
  city: 'SAVANNAH, GA', postalCode: '31405', phone: '912-234-7773', salesperson: 'IZZY',
} as const

export const bosCurrency = 'USD'
export const bosShippingLabel = 'Shipping to Rotterdam'
export function bosToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function validBosDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T12:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validBosMoney(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99999999.99
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
}
export function bosAmounts(vehiclePrice: number, shipping: number, paidAmount: number) {
  if (![vehiclePrice, shipping, paidAmount].every(validBosMoney)) throw new Error('Въведи неотрицателни суми с най-много два знака след десетичната запетая.')
  const totalCents = Math.round(vehiclePrice * 100) + Math.round(shipping * 100)
  const paidCents = Math.round(paidAmount * 100)
  if (paidCents > totalCents) throw new Error('Платената сума не може да надвишава общата сума.')
  return { total: totalCents / 100, balance: (totalCents - paidCents) / 100 }
}
export const bosMoney = (value: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
export const bosDate = (value: string) => value.slice(5, 7) + '.' + value.slice(8, 10) + '.' + value.slice(0, 4)
