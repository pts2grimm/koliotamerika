'use client'

import { SiteLink as Link } from '@/components/SiteLink'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Images } from 'lucide-react'

export function CardPhotos({ images, title, href, badge }: { images: string[]; title: string; href: string; badge: string }) {
 const [active, setActive] = useState(0)
 const [ready, setReady] = useState(false)
 useEffect(() => setReady(true), [])
 const selected = images[active] || images[0]
 return <div className="card-photos">
  <CardPhoto key={selected || "empty"} src={selected} title={title} number={active + 1} href={href} />
  <span className="car-badge">{badge}</span>
  {images.length > 1 && <>
   <button type="button" disabled={!ready} className="card-photo-arrow card-photo-prev" aria-label="Предишна снимка в обявата" onClick={() => setActive(index => (index + images.length - 1) % images.length)}><ChevronLeft size={20} /></button>
   <button type="button" disabled={!ready} className="card-photo-arrow card-photo-next" aria-label="Следваща снимка в обявата" onClick={() => setActive(index => (index + 1) % images.length)}><ChevronRight size={20} /></button>
   <span className="card-photo-count"><Images size={13} /><span aria-live="polite">{active + 1} / {images.length}</span></span>
  </>}
 </div>
}

function CardPhoto({ src, title, number, href }: { src?: string; title: string; number: number; href: string }) {
 const [failed, setFailed] = useState(false)
 const [attempt, setAttempt] = useState(0)
 const image = useRef<HTMLImageElement>(null)
 // A server-rendered image can fail before React attaches the error handler.
 useEffect(() => {
  if (image.current?.complete && image.current.naturalWidth === 0) setFailed(true)
 }, [attempt])
 const imageProps = { ref: image, alt: `${title} — снимка ${number}`, onError: () => setFailed(true) }
 return <>
  <Link href={href} className="card-photo-link" aria-label={`Разгледай ${title}`}>
   {failed ? <span className="image-placeholder" role="status">Снимката временно не се зарежда</span>
    : src?.startsWith('/') ? <Image key={attempt} {...imageProps} src={src} fill sizes="(max-width: 760px) 100vw, (max-width: 900px) 50vw, 33vw" />
    : src ? <img key={attempt} {...imageProps} src={src} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    : <span className="image-placeholder">Снимки не са налични</span>}
  </Link>
  {failed && <button type="button" className="card-photo-retry" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Опитай отново</button>}
 </>
}
