'use client'

import { useDocumentNavigation } from '@/lib/use-document-navigation'
import { LoadingIndicator } from './LoadingIndicator'
import { auctionResultsURL } from '@/lib/auction-filters'
import { auctionSortOptions, catalogueSort } from '@/lib/auction-sorting'

export function AuctionSort({ initial, basePath, archive }: { initial: Record<string,string>; basePath: string; archive: boolean }) {
 const { pending, navigate } = useDocumentNavigation()
 return <div className="auction-sort" aria-busy={pending}>
  <label>Подреди по
   <select name="sort" value={catalogueSort(initial.sort)} disabled={pending} onChange={event => {
    navigate(auctionResultsURL({ ...initial, sort: event.target.value }, 1, basePath))
   }}>
    {auctionSortOptions.filter(option => option.value !== '').map(option => <option key={option.value} value={option.value}>{archive && option.value === 'auction_soon' ? 'Дата на търга: по-стари първо' : archive && option.value === 'auction_late' ? 'Дата на търга: последни първо' : option.label}</option>)}
   </select>
  </label>
  {pending && <LoadingIndicator>Подреждаме резултатите…</LoadingIndicator>}
 </div>
}
