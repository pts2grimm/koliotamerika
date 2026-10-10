'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

export function FilterPanel({ children, count }: { children: ReactNode; count: number }) {
 const [mobile, setMobile] = useState(false)
 const [open, setOpen] = useState(false)
 const dialog = useRef<HTMLDialogElement>(null)
 useEffect(() => {
  const media = window.matchMedia('(max-width: 900px)')
  const update = () => { setMobile(media.matches); setOpen(false) }
  update(); media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
 }, [])
 useEffect(() => {
  if (!open || !mobile) { dialog.current?.close(); return }
  dialog.current?.showModal()
  const overflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = overflow }
 }, [open, mobile])
 if (!mobile) return <aside className="catalogue-sidebar" aria-label="Филтри за търговете">{children}</aside>
 return <div className="mobile-filter-bar">
  <button className="button button-dark filter-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"><SlidersHorizontal size={18} />Филтри{count > 0 && <span>{count}</span>}</button>
  <span>Открий точния автомобил</span>
  <dialog ref={dialog} className="filter-dialog" aria-label="Филтри за търговете" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
   <div className="filter-dialog-inner"><header><span>ТВОЯТ ИЗБОР</span><button type="button" className="filter-close" aria-label="Затвори филтрите" onClick={() => setOpen(false)} autoFocus><X size={23} /></button></header>{children}</div>
  </dialog>
 </div>
}
