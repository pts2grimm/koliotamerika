'use client'

import { SiteLink as Link } from '@/components/SiteLink'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Images } from 'lucide-react'

export function CardPhotos({ images, title, href, badge }: { images: string[]; title: string; href: string; badge: string }) {
 const [active, setActive] = useState(0)
 const [ready, setReady] = useState(false)
 useEffect(() => setReady(true), [])
 const selected = images[active] || images[0]
 return <div className="card-photos">
  <Link href={href} className="card-photo-link" aria-label={`Разгледай ${title}`}>
   {selected?.startsWith('/') ? <Image src={selected} alt={`${title} — снимка ${active + 1}`} fill sizes="(max-width: 760px) 100vw, (max-width: 900px) 50vw, 33vw" /> : selected ? <img src={selected} alt={`${title} — снимка ${active + 1}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="image-placeholder">Снимки не са налични</span>}
  </Link>
  <span className="car-badge">{badge}</span>
  {images.length > 1 && <>
   <button type="button" disabled={!ready} className="card-photo-arrow card-photo-prev" aria-label="Предишна снимка в обявата" onClick={() => setActive(index => (index + images.length - 1) % images.length)}><ChevronLeft size={20} /></button>
   <button type="button" disabled={!ready} className="card-photo-arrow card-photo-next" aria-label="Следваща снимка в обявата" onClick={() => setActive(index => (index + 1) % images.length)}><ChevronRight size={20} /></button>
   <span className="card-photo-count"><Images size={13} /><span aria-live="polite">{active + 1} / {images.length}</span></span>
  </>}
 </div>
}
