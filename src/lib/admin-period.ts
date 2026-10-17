const day = 86400000
export const sofiaDay = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date)
export function shiftDay(value: string, amount: number) {
  return new Date(Date.parse(value + 'T12:00:00Z') + amount * day).toISOString().slice(0, 10)
}
export function dayStart(value: string) {
  const utc = Date.parse(value + 'T00:00:00Z')
  const zone = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Sofia', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(utc)).find(part => part.type === 'timeZoneName')?.value || 'GMT+2'
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone)!
  const minutes = (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1)
  return new Date(utc - minutes * 60000).toISOString()
}
function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
}
export function adminPeriod(params: Record<string, unknown> = {}, now = new Date()) {
  const today = sofiaDay(now)
  const preset = ['7', '30', '90', 'custom'].includes(String(params.period)) ? String(params.period) : '30'
  let to = preset === 'custom' && validDay(params.to) && params.to <= today ? params.to : today
  let from = preset === 'custom' && validDay(params.from) ? params.from : shiftDay(to, -(preset === '7' ? 6 : preset === '90' ? 89 : 29))
  const oldest = shiftDay(today, -179)
  if (to < oldest) to = oldest
  if (from < oldest) from = oldest
  if (from > to) from = to
  if (from < shiftDay(to, -89)) from = shiftDay(to, -89)
  const days = Math.round((Date.parse(to) - Date.parse(from)) / day) + 1
  const previousFrom = shiftDay(from, -days)
  return { preset, from, to, days, start: dayStart(from), end: dayStart(shiftDay(to, 1)),
    previousFrom, previousTo: shiftDay(from, -1), previousStart: dayStart(previousFrom), previousEnd: dayStart(from),
    dates: Array.from({ length: days }, (_, index) => shiftDay(from, index)) }
}
export type AdminPeriod = ReturnType<typeof adminPeriod>
