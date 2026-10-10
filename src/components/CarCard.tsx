import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Gauge, CalendarDays, Fuel } from 'lucide-react'
import type { Car } from '@/payload-types'
import { mediaUrl, imageAlt, money } from '@/lib/data'
export const availabilityLabels = { available: 'Наличен', order: 'По поръчка', sold: 'Продаден' }
export function CarCard({ car }: { car: Car }) { const image = mediaUrl(car.image); return <Link className="car-card" href={`/avtomobili/${car.slug}`}><div className="car-image">{image ? <Image src={image} alt={imageAlt(car.image, car.title)} fill sizes="(max-width: 700px) 100vw, 33vw" /> : <span className="image-placeholder">Снимки скоро</span>}<span className="car-badge">{availabilityLabels[car.availability || 'order']}</span><span className="car-arrow"><ArrowUpRight size={20} /></span></div><div className="car-content"><span className="eyebrow">{car.make}</span><h3>{car.title}</h3><div className="car-specs"><span><CalendarDays size={14} />{car.year}</span>{car.mileage != null && <span><Gauge size={14} />{car.mileage.toLocaleString('bg-BG')} км</span>}{car.fuel && <span><Fuel size={14} />{car.fuel}</span>}</div><div className="car-price">{car.price != null ? money(car.price) : 'Цена при запитване'}<span>Виж автомобила</span></div></div></Link> }
