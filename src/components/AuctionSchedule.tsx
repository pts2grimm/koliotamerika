'use client'

import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { auctionSchedule, parseAuctionDate } from '@/lib/auction-schedule'

export function AuctionSchedule({ date, initialNow }: { date?: string; initialNow: number }) {
 const timestamp = parseAuctionDate(date)
 const [now, setNow] = useState(initialNow)
 useEffect(() => {
  if (timestamp === null) return
  let timer: number | undefined
  // Refresh when the displayed minute changes, and immediately on returning
  // to the tab. This does not make new requests to the auction provider.
  const update = () => {
   const current = Date.now()
   setNow(current)
   window.clearTimeout(timer)
   if (timestamp > current) timer = window.setTimeout(update, (timestamp - current) % 60000 + 1)
  }
  update()
  document.addEventListener('visibilitychange', update)
  return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', update) }
 }, [timestamp])
 const schedule = auctionSchedule(timestamp, now)
 return <div className={`auction-schedule auction-schedule-${schedule.state}`} aria-label="Дата и час на търга">
  <CalendarClock size={19} aria-hidden="true" />
  <div><span className="auction-schedule-label">{schedule.state === 'upcoming' ? 'ДО ТЪРГА' : 'ДАТА НА ТЪРГА'}</span><strong className="auction-countdown">{schedule.countdown}</strong>
   {timestamp !== null && <><time dateTime={new Date(timestamp).toISOString()}>{schedule.date} · {schedule.time} ч.</time><small>Българско време</small></>}
  </div>
 </div>
}
