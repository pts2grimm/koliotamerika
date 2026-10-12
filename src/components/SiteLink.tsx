'use client'
import { privateTrackingPath } from '@/lib/integration-config'
import NextLink from 'next/link'
import { AuctionLink } from './AuctionLink'
import { auctionPrefetchKey } from '@/lib/auction-prefetch'
import type { ComponentProps } from 'react'

// Avoid viewport prefetch for metered auction routes. Detail links prepare only
// after deliberate hover/focus, with a shared per-browser budget.
export function SiteLink(props: ComponentProps<typeof NextLink>) {
 const pathname = typeof props.href === 'string' ? props.href.split(/[?#]/, 1)[0] : props.href.pathname
 // Leave the document before entering account pages, so third-party history listeners cannot observe them.
 if (pathname && privateTrackingPath(pathname)) return <NextLink {...props} prefetch={false} onNavigate={event => {
  event.preventDefault()
  window.location.assign(typeof props.href === 'string' ? props.href : pathname)
 }} />
 if(auctionPrefetchKey(props.href))return <AuctionLink {...props}/>
 const usesAuctions = pathname === '/' || pathname === '/targove' || pathname?.startsWith('/targove/')
 return <NextLink {...props} prefetch={usesAuctions ? false : props.prefetch} />
}
