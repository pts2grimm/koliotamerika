'use client'
import NextLink, { useLinkStatus } from 'next/link'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { createAuctionPrefetchBudget } from '@/lib/auction-prefetch'

const budget=createAuctionPrefetchBudget()
function Pending() {
 const {pending}=useLinkStatus()
 return pending?createPortal(<span className="auction-navigation-status" role="status">Отваряме автомобила…</span>,document.body):null
}
export function AuctionLink(props:ComponentProps<typeof NextLink>) {
 const [armed,setArmed]=useState(false)
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const cancel=()=>{clearTimeout(timer.current);setArmed(false)}
 useEffect(()=>()=>clearTimeout(timer.current),[])
 const warm=()=>{
  const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection
  if(props.prefetch===false||props.download||props.target==='_blank'||connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType||''))return
  if(budget.claim(props.href))setArmed(true)
 }
 return <NextLink {...props} prefetch={armed}
  onPointerEnter={event=>{props.onPointerEnter?.(event);if(!event.defaultPrevented&&event.pointerType==='mouse'){clearTimeout(timer.current);timer.current=setTimeout(warm,180)}}}
  onPointerLeave={event=>{props.onPointerLeave?.(event);cancel()}}
  onFocus={event=>{props.onFocus?.(event);if(!event.defaultPrevented)warm()}}
  onBlur={event=>{props.onBlur?.(event);cancel()}}
  onNavigate={event=>{
   let cancelled=false
   props.onNavigate?.({preventDefault(){cancelled=true;event.preventDefault()}})
   // Full-route prefetch can outlive fresh auction data in Next's client cache.
   // Old prepared routes get a fresh document request instead of reusing that payload.
   if(!cancelled&&budget.expired(props.href)&&typeof props.href==='string'){
    event.preventDefault();window.location.assign(props.href)
   }
  }}>
  {props.children}<Pending/>
 </NextLink>
}
