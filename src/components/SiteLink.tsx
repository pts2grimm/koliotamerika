'use client'
import NextLink from 'next/link'
import type { ComponentProps } from 'react'

// These destinations read the metered auction API. Load them only on navigation,
// including links in photo cards, related vehicles, saved cars and pagination.
export function SiteLink(props: ComponentProps<typeof NextLink>) {
 const pathname = typeof props.href === 'string' ? props.href.split(/[?#]/, 1)[0] : props.href.pathname
 const usesAuctions = pathname === '/' || pathname === '/targove' || pathname?.startsWith('/targove/')
 return <NextLink {...props} prefetch={usesAuctions ? false : props.prefetch} />
}
