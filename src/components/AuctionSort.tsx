'use client'

import { useState } from 'react'
import { auctionResultsURL } from '@/lib/auction-filters'
import { auctionSortOptions } from '@/lib/auction-sorting'

export function AuctionSort({ initial, basePath, archive }: { initial: Record<string,string>; basePath: string; archive: boolean }) {
 const [pending, setPending] = useState(false)
 return <div className="auction-sort" aria-busy={pending}>
  <label>Подреди по
   <select name="sort" value={initial.sort || ''} disabled={pending} onChange={event => {
    setPending(true)
    window.location.assign(auctionResultsURL({ ...initial, sort: event.target.value }, 1, basePath))
   }}>
    {auctionSortOptions.map(option => <option key={option.value} value={option.value}>{archive && option.value === 'auction_soon' ? 'Дата на търга: по-стари първо' : archive && option.value === 'auction_late' ? 'Дата на търга: последни първо' : option.label}</option>)}
   </select>
  </label>
  {pending && <span role="status">Подреждаме автомобилите…</span>}
 </div>
}
