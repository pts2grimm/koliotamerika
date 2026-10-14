const timeZone = 'Europe/Sofia'
const dateFormatter = new Intl.DateTimeFormat('bg-BG', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('bg-BG', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

// ApiCar supplies ISO timestamps with a UTC suffix. Never interpret an
// unzoned timestamp using the visitor's or hosting server's local timezone.
export function parseAuctionDate(value?: string): number | null {
 if (!value) return null
 const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value.trim())
 if (!match) return null
 const [, year, month, day] = match.map(Number)
 if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null
 const timestamp = Date.parse(value.trim())
 return Number.isFinite(timestamp) ? timestamp : null
}

export function auctionSchedule(timestamp: number | null, now: number) {
 if (timestamp === null) return { state: 'unknown', countdown: 'Очаква се дата', date: '', time: '' } as const
 const date = dateFormatter.format(timestamp)
 const time = timeFormatter.format(timestamp)
 const remaining = timestamp - now
 if (remaining <= 0) return { state: 'past', countdown: 'Посоченият час е минал', date, time } as const
 const minutes = Math.floor(remaining / 60000)
 const days = Math.floor(minutes / 1440)
 const hours = Math.floor((minutes % 1440) / 60)
 const mins = minutes % 60
 const parts = [days ? `${days} ${days === 1 ? 'ден' : 'дни'}` : '', hours ? `${hours} ч` : '', mins ? `${mins} мин` : ''].filter(Boolean)
 return { state: 'upcoming', countdown: parts.length ? parts.join(' · ') : 'Под 1 минута', date, time } as const
}
