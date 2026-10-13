'use client'
import { useLinkStatus } from 'next/link'
import { createPortal } from 'react-dom'
import { LoadingIndicator } from './LoadingIndicator'

export function AuctionLinkPending({ detail = false, documentPending = false }: { detail?: boolean; documentPending?: boolean }) {
 const { pending } = useLinkStatus()
 return pending || documentPending ? createPortal(<LoadingIndicator className="auction-navigation-status">{detail ? 'Отваряме автомобила…' : 'Зареждаме търговете…'}</LoadingIndicator>, document.body) : null
}
