'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import type { DetailHint } from '@/lib/vehicle-details'

export function DetailTooltip({ label, text, tone }: DetailHint) {
 const id = useId()
 const trigger = useRef<HTMLButtonElement>(null)
 const bubble = useRef<HTMLSpanElement>(null)
 const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
 const [open, setOpen] = useState(false)
 const [position, setPosition] = useState({ left: 12, top: 12 })
 const show = () => { clearTimeout(timer.current); setOpen(true) }
 const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }
 useEffect(() => {
  if (!open) return
  const place = () => {
   const box = trigger.current?.getBoundingClientRect(), tip = bubble.current?.getBoundingClientRect()
   if (!box || !tip) return
   setPosition({ left: Math.max(12, Math.min(box.right - tip.width, window.innerWidth - tip.width - 12)), top: box.bottom + tip.height + 20 < window.innerHeight ? box.bottom + 8 : Math.max(12, box.top - tip.height - 8) })
  }
  const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
  const outside = (e: PointerEvent) => { if (!trigger.current?.contains(e.target as Node) && !bubble.current?.contains(e.target as Node)) setOpen(false) }
  place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
  document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside)
  return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside) }
 }, [open])
 useEffect(() => () => clearTimeout(timer.current), [])
 return <><button ref={trigger} type="button" className={`detail-hint hint-${tone}`} aria-label={`Пояснение: ${label}`} aria-describedby={open ? id : undefined} onPointerEnter={e => { if (e.pointerType === 'mouse') show() }} onPointerLeave={e => { if (e.pointerType === 'mouse') hide() }} onFocus={show} onBlur={() => setOpen(false)} onClick={show}><span>{label}</span><Info size={16} aria-hidden="true" /></button>{open && createPortal(<span ref={bubble} id={id} role="tooltip" className="detail-tooltip" style={position} onPointerEnter={show} onPointerLeave={hide}>{text}</span>, document.body)}</>
}
