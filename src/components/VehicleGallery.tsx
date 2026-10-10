'use client'

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'

export type GalleryImage = { src: string; alt: string }

export function VehicleGallery({ images, title, children }: { images: GalleryImage[]; title: string; children?: ReactNode }) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const selected = images[active] || images[0]
  const multiple = images.length > 1
  const move = (direction: number) => setActive(index => (index + direction + images.length) % images.length)

  useEffect(() => {
    if (!open) { dialog.current?.close(); return }
    dialog.current?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  function touchStart(event: TouchEvent) {
    if (event.touches.length !== 1) { touch.current = null; return }
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  function touchEnd(event: TouchEvent) {
    if (!touch.current || !multiple) return
    const deltaX = event.changedTouches[0].clientX - touch.current.x
    const deltaY = event.changedTouches[0].clientY - touch.current.y
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) move(deltaX < 0 ? 1 : -1)
    touch.current = null
  }

  if (!selected) return <div className="detail-photo"><span className="image-placeholder">Снимки не са налични</span>{children}</div>

  const navigation = <>
    {multiple && <><button type="button" className="gallery-nav gallery-prev" aria-label="Предишна снимка" onClick={() => move(-1)}><ChevronLeft size={25} /></button><button type="button" className="gallery-nav gallery-next" aria-label="Следваща снимка" onClick={() => move(1)}><ChevronRight size={25} /></button></>}
    <output className="gallery-counter" aria-live="polite">{active + 1} / {images.length}</output>
  </>

  return <div className="vehicle-gallery" onKeyDown={event => {
    if (!multiple) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1) }
  }}>
    <div className="vehicle-gallery-stage" onTouchStart={touchStart} onTouchEnd={touchEnd}>
      <button type="button" className="gallery-open" onClick={() => setOpen(true)} aria-label={`Увеличи снимка ${active + 1}`}>
        <img src={selected.src} alt={selected.alt} draggable={false} referrerPolicy="no-referrer" fetchPriority="high" />
        <span className="gallery-expand"><Expand size={18} />Увеличи</span>
      </button>
      {children}{navigation}
    </div>
    {multiple && <div className="gallery-thumbnails" aria-label="Снимки на автомобила">{images.map((image, index) => <button type="button" key={image.src} aria-label={`Покажи снимка ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}><img src={image.src} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" /></button>)}</div>}
    <dialog ref={dialog} className="gallery-dialog" aria-label={`Галерия: ${title}`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      {open && <div className="gallery-dialog-content" onTouchStart={touchStart} onTouchEnd={touchEnd}>
        <div className="gallery-dialog-header"><span>{title}</span><button type="button" className="gallery-close" aria-label="Затвори галерията" onClick={() => setOpen(false)} autoFocus><X size={24} /></button></div>
        <img className="gallery-large-image" src={selected.src} alt={selected.alt} draggable={false} referrerPolicy="no-referrer" />
        {navigation}
      </div>}
    </dialog>
  </div>
}
