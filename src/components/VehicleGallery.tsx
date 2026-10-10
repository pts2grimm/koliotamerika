'use client'

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react'

import { vehicleVideo } from '@/lib/vehicle-video'

export type GalleryImage = { src: string; alt: string }

export function VehicleGallery({ images, title, video, children }: { images: GalleryImage[]; title: string; video?: string; children?: ReactNode }) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'photos' | 'video'>('photos')
  const [videoError, setVideoError] = useState(false)
  const clip = vehicleVideo(video)
  const openVideo = () => { setVideoError(false); setMode('video'); setOpen(true) }
  const player = useRef<HTMLVideoElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const selected = images[active] || images[0]
  const multiple = images.length > 1
  const move = (direction: number) => setActive(index => (index + direction + images.length) % images.length)

  useEffect(() => {
    if (!open) { dialog.current?.close(); return }
    dialog.current?.showModal()
    const currentPlayer = player.current
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { currentPlayer?.pause(); document.body.style.overflow = previous }
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

  if (!selected && !clip) return <div className="detail-photo"><span className="image-placeholder">Снимки не са налични</span>{children}</div>

  const navigation = <>
    {multiple && <><button type="button" className="gallery-nav gallery-prev" aria-label="Предишна снимка" onClick={() => move(-1)}><ChevronLeft size={25} /></button><button type="button" className="gallery-nav gallery-next" aria-label="Следваща снимка" onClick={() => move(1)}><ChevronRight size={25} /></button></>}
    <output className="gallery-counter" aria-live="polite">{active + 1} / {images.length}</output>
  </>

  return <div className="vehicle-gallery" onKeyDown={event => {
    if (!multiple || (open && mode === 'video')) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1) }
  }}>
    <div className="vehicle-gallery-stage" onTouchStart={touchStart} onTouchEnd={touchEnd}>
      {selected ? <button type="button" className="gallery-open" onClick={() => { setMode('photos'); setOpen(true) }} aria-label={`Увеличи снимка ${active + 1}`}>
        <img src={selected.src} alt={selected.alt} draggable={false} referrerPolicy="no-referrer" fetchPriority="high" />
        <span className="gallery-expand"><Expand size={18} />Увеличи</span>
      </button> : <button type="button" className="gallery-video-placeholder" onClick={openVideo}><Play size={38} /><span>Видео на двигателя</span></button>}
      {children}{selected && navigation}
    </div>
    {(multiple || clip) && <div className="gallery-thumbnails" aria-label="Снимки и видео на автомобила">
      {clip && <button type="button" className="gallery-video-thumb" aria-label="Пусни видео на двигателя" aria-pressed={open && mode === 'video'} onClick={openVideo}><Play size={23} /><span>Видео на двигателя</span></button>}
      {images.map((image, index) => <button type="button" key={image.src} aria-label={`Покажи снимка ${index + 1}`} aria-pressed={index === active && !(open && mode === 'video')} onClick={() => setActive(index)}><img src={image.src} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" /></button>)}
    </div>}
    <dialog ref={dialog} className="gallery-dialog" aria-label={`${mode === 'video' ? 'Видео на двигателя' : 'Галерия'}: ${title}`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      {open && <div className="gallery-dialog-content" onTouchStart={mode === 'photos' ? touchStart : undefined} onTouchEnd={mode === 'photos' ? touchEnd : undefined}>
        <div className="gallery-dialog-header"><span>{mode === 'video' ? `Видео на двигателя · ${title}` : title}</span><button type="button" className="gallery-close" aria-label="Затвори галерията" onClick={() => setOpen(false)} autoFocus><X size={24} /></button></div>
        {mode === 'video' && clip ? <div className="gallery-video-content">{clip.kind === 'embed' ? <iframe title={`Видео на двигателя: ${title}`} src={clip.src} allow="fullscreen; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" /> : <video ref={player} poster={images[0]?.src} controls playsInline preload="none" aria-label={`Видео на двигателя: ${title}`} src={clip.src} onError={() => setVideoError(true)} />}{videoError && <p className="gallery-video-error" role="alert">Видеото не може да се възпроизведе в момента. <a href={clip.src} target="_blank" rel="noopener noreferrer">Отвори видеото отделно</a></p>}</div> : selected && <><img className="gallery-large-image" src={selected.src} alt={selected.alt} draggable={false} referrerPolicy="no-referrer" />{navigation}</>}
      </div>}
    </dialog>
  </div>
}
