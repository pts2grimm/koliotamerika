/** Keep the explicit CAD code; only USD uses the requested dollar symbol. */
export function formatCurrency(value: number, currency = 'EUR', maximumFractionDigits = 2) {
 const code = currency.toUpperCase()
 return new Intl.NumberFormat('bg-BG', { style: 'currency', currency: code, maximumFractionDigits })
  .formatToParts(value).map(part => part.type === 'currency' && code === 'USD' ? '$' : part.value).join('')
}
