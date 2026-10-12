import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight } from 'lucide-react'
import { searchAuctions, type AuctionCar } from '@/lib/auctions'
import { AuctionCard } from './AuctionCard'

export async function RelatedAuctions({ car }: { car: AuctionCar }) {
  if (!car.make) return null
  const filters = new URLSearchParams({ make: car.make, ...(car.model ? { model: car.model } : {}) })
  let items: AuctionCar[] = []
  let unavailable = false
  try {
    const result = await searchAuctions(new URLSearchParams({ ...Object.fromEntries(filters), site: '1,2', vehicle_type: car.vehicle_type || 'Automobile', size: '12', page: '1' }).toString())
    items = result.items.filter(item => item.id !== car.id && (!car.vin || item.vin !== car.vin))
      .sort((a, b) => Math.abs(a.year - car.year) - Math.abs(b.year - car.year)).slice(0, 3)
  } catch { unavailable = true }
  return <section className="related-vehicles" aria-labelledby="related-auctions-title">
    <div className="section-heading"><div><span className="eyebrow orange">СРАВНИ ВЪЗМОЖНОСТИТЕ</span><h2 id="related-auctions-title">Свързани автомобили</h2><p>Още предложения за {[car.make, car.model].filter(Boolean).join(' ')}.</p></div><Link href={`/targove?${filters}`} className="text-link">Всички предложения <ArrowUpRight size={18} /></Link></div>
    {items.length ? <div className="car-grid">{items.map(item => <AuctionCard key={item.id} car={item} />)}</div> : <p>{unavailable ? 'Свързаните предложения временно не се зареждат. Опитай отново от каталога.' : 'В момента няма други предложения за този модел. Разгледай всички автомобили от марката.'} {!unavailable && <Link className="text-link" href={`/targove?make=${encodeURIComponent(car.make)}`}>{car.make} <ArrowUpRight size={16} /></Link>}</p>}
  </section>
}
