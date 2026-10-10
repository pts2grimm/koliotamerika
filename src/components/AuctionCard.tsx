import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Gauge, Fuel } from 'lucide-react'
import { auctionCurrency, auctionImages, type AuctionCar } from '@/lib/auctions'
import { SaveAuction } from './SaveAuction'
import { CardPhotos } from './CardPhotos'

export function AuctionCard({ car }: { car: AuctionCar }) {
 const href = `/targove/kola?lot=${car.lot_id}&site=${car.site}`
 const fuel = ({ Gasoline: 'Бензин', Diesel: 'Дизел', Hybrid: 'Хибрид', Electric: 'Електрически' } as Record<string, string>)[car.fuel || ''] || car.fuel
 return <article className="car-card auction-card">
  <CardPhotos images={auctionImages(car)} title={car.title} href={href} badge={car.site === 1 ? 'COPART' : 'IAAI'} />
  <Link href={href} className="car-content auction-card-link">
   <span className="eyebrow">ЛОТ {car.lot_id}</span><h3>{car.title}</h3>
   <div className="car-specs"><span><CalendarDays size={14} />{car.year}</span>{car.odometer != null && <span><Gauge size={14} />{car.odometer.toLocaleString('bg-BG')} мили</span>}{fuel && <span><Fuel size={14} />{fuel}</span>}</div>
   <p className="auction-damage">{car.damage_pr || 'Щетите се уточняват'}<span>{car.status || 'Без посочено състояние'}</span></p>
   <div className="auction-price-row"><div><span className="price-label">Текущ залог</span><strong>{car.current_bid != null ? auctionCurrency(car.current_bid, car.currency) : 'Няма оферта'}</strong><span className="price-disclaimer">Без разходите за внос</span></div><span className="card-detail-arrow" aria-label="Виж автомобила"><ArrowUpRight size={22} /></span></div>
  </Link>
  <SaveAuction lot={String(car.lot_id)} site={String(car.site)} title={car.title} />
 </article>
}
