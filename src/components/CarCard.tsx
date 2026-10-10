import { CardPhotos } from './CardPhotos'
import Link from 'next/link'
import { ArrowUpRight, Gauge, CalendarDays, Fuel } from 'lucide-react'
import type { Car } from '@/payload-types'
import { mediaUrl, money } from '@/lib/data'
export const availabilityLabels = { available: 'Наличен', order: 'По поръчка', sold: 'Продаден' }
export function CarCard({ car }: { car: Car }) {
 const images = [...new Set([car.image, ...(car.gallery || []).map(item => item.image)].map(mediaUrl).filter((src): src is string => !!src))]
 const href = `/avtomobili/${car.slug}`
 return <article className="car-card"><CardPhotos images={images} title={car.title} href={href} badge={availabilityLabels[car.availability || 'order']} /><Link className="car-content" href={href}><span className="eyebrow">{car.make}</span><h3>{car.title}</h3><div className="car-specs"><span><CalendarDays size={14} />{car.year}</span>{car.mileage != null && <span><Gauge size={14} />{car.mileage.toLocaleString('bg-BG')} км</span>}{car.fuel && <span><Fuel size={14} />{car.fuel}</span>}</div><div className="car-price">{car.price != null ? money(car.price) : 'Цена при запитване'}<span>Виж автомобила <ArrowUpRight size={16} /></span></div></Link></article>
}
