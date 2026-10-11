'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import gallery from '../../content/legacy-gallery.json'

export function LegacyGallery() {
 const [brand,setBrand]=useState('')
 const brands=[...new Set(gallery.items.map(item=>item.brand))].sort((a,b)=>a.localeCompare(b))
 const visible=gallery.items.filter(item=>!brand||item.brand===brand)
 return <section className="container legacy-gallery" aria-labelledby="gallery-title">
  <div className="legacy-gallery-heading"><div><span className="eyebrow orange">ОТ НАШАТА ГАЛЕРИЯ</span><h2 id="gallery-title">Автомобилите в снимки</h2><p>Разгледай по марка. Това са примери от галерията ни, а не обяви за текуща продажба.</p></div>
   <div className="legacy-gallery-filter"><label htmlFor="gallery-brand">Марка</label><span className="legacy-gallery-select"><select id="gallery-brand" value={brand} onChange={event=>setBrand(event.target.value)} aria-controls="gallery-photos"><option value="">Всички марки</option>{brands.map(name=><option key={name} value={name}>{name}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></span></div>
  </div>
  <p className="legacy-gallery-count" role="status" aria-live="polite">{visible.length} от {gallery.items.length} автомобила</p>
  <div className="legacy-photo-grid" id="gallery-photos">{visible.map(item=><figure key={item.src}>
   <a href={item.src} target="_blank" rel="noopener noreferrer" aria-label={'Отвори снимката: '+item.title+' (нов раздел)'}><Image src={item.src} width={item.width} height={item.height} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" alt={item.title} /></a>
   <figcaption><span>{item.brand}</span><strong>{item.title}</strong></figcaption>
  </figure>)}</div>
 </section>
}
