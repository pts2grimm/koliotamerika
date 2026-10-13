'use client'
import { useDocumentNavigation } from '@/lib/use-document-navigation'
import { LoadingIndicator } from './LoadingIndicator'
import { Search } from 'lucide-react'

// Native GET submission remains available before hydration and without JavaScript.
export function AuctionSearchForm({ children, action, className, label, buttonLabel, outlined = false }: {
 children: React.ReactNode; action: string; className: string; label: string; buttonLabel: string; outlined?: boolean
}) {
 const { pending, navigate } = useDocumentNavigation()
 return <form action={action} className={className} aria-label={label} aria-busy={pending} onSubmit={event=>{
  event.preventDefault()
  const params=new URLSearchParams()
  for(const [key,value] of new FormData(event.currentTarget)) if(typeof value==='string' && value.trim()) params.set(key,value.trim())
  navigate(action+(params.size?'?'+params.toString():''))
 }}>
  {children}
  <button className={'button search-submit '+(outlined?'button-outline':'button-dark')} type="submit" disabled={pending}>
   <span className="search-button-content">
    <span className="search-button-idle" aria-hidden={pending}><Search size={18} />{buttonLabel}</span>
    <span className="search-button-loading" aria-hidden={!pending}><LoadingIndicator>Търсим…</LoadingIndicator></span>
   </span>
  </button>
 </form>
}
