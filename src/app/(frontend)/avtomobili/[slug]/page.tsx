import { SaveVehicle } from '@/components/SaveAuction'
import { VehicleGallery } from '@/components/VehicleGallery'
import { CarCard } from '@/components/CarCard'
import type { Metadata } from 'next'
import { SiteLink as Link } from '@/components/SiteLink'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react'
import { cms, imageAlt, mediaUrl, money, siteURL } from '@/lib/data'
import { availabilityLabels } from '@/components/CarCard'
const getCar = cache(async (slug: string) => (await (await cms()).find({ collection: 'cars', overrideAccess: false, where: { slug: { equals: slug } }, limit: 1 })).docs[0])
type Props = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const car = await getCar((await params).slug); if (!car) return {}; const image = mediaUrl(car.seo?.image) || mediaUrl(car.image); return { title: car.seo?.title || car.title, description: car.seo?.description || car.description.slice(0, 160), alternates: { canonical: `/avtomobili/${car.slug}` }, ...(car.seo?.noIndex ? { robots: { index: false, follow: true } } : {}), openGraph: { title: car.seo?.title || car.title, description: car.seo?.description || car.description.slice(0, 160), url: `/avtomobili/${car.slug}`, ...(image ? { images: [image] } : {}) } } }
export default async function CarPage({ params }: Props) {
 const car = await getCar((await params).slug); if (!car) notFound()
 const image = mediaUrl(car.image)
 const seen = new Set<string>()
 const images = [car.image, ...(car.gallery || []).map(item => item.image)].flatMap(item => {
  const src = mediaUrl(item); if (!src || seen.has(src)) return []; seen.add(src)
  return [{ src, alt: imageAlt(item, car.title) }]
 })
 const related = (await (await cms()).find({ collection: 'cars', overrideAccess: false, where: { and: [{ id: { not_equals: car.id } }, { make: { equals: car.make } }] }, limit: 12 })).docs
  .sort((a,b) => Number(b.model === car.model) - Number(a.model === car.model) || Math.abs(a.year-car.year) - Math.abs(b.year-car.year)).slice(0,3)
 const schema = { '@context': 'https://schema.org', '@type': 'Car', name: car.title, brand: { '@type': 'Brand', name: car.make }, model: car.model, vehicleModelDate: String(car.year), description: car.description, url: `${siteURL()}/avtomobili/${car.slug}`, ...(image ? { image: new URL(image, siteURL()).href } : {}), ...(car.mileage != null ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' } } : {}) }
 return <section className="container car-detail"><Link className="text-link back-link" href="/avtomobili"><ArrowLeft size={17} />Към автомобилите</Link><div className="detail-grid"><VehicleGallery key={car.id} images={images} title={car.title} /><div className="detail-summary"><span className="eyebrow orange">{availabilityLabels[car.availability || 'order']}</span><h1>{car.title}</h1><SaveVehicle vehicle={{ kind: 'car', slug: car.slug, title: car.title }} /><p className="detail-price">{car.price != null ? money(car.price) : 'Цена при запитване'}</p><dl className="spec-table">{[['Марка', car.make], ['Модел', car.model], ['Година', car.year], ['Пробег', car.mileage != null ? `${car.mileage.toLocaleString('bg-BG')} км` : null], ['Гориво', car.fuel], ['Скорости', car.transmission], ['Мощност', car.power ? `${car.power} к.с.` : null]].map(([name, value]) => value != null && <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><Link className="button button-orange" href={`/kontakti?car=${encodeURIComponent(car.title)}`}>Запитване за автомобила <ArrowUpRight size={18} /></Link></div></div><div className="article-body"><h2>За автомобила</h2>{car.description.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}{!!car.features?.length && <><h2>Оборудване</h2><ul className="equipment">{car.features.map(item => <li key={item.id || item.label}><Check size={17} />{item.label}</li>)}</ul></>}</div><section className="related-vehicles" aria-labelledby="related-cars-title"><div className="section-heading"><div><span className="eyebrow orange">ОЩЕ ОТ МАРКАТА</span><h2 id="related-cars-title">Свързани автомобили</h2></div><Link className="text-link" href={`/avtomobili?q=${encodeURIComponent(car.make)}`}>Всички {car.make} <ArrowUpRight size={18} /></Link></div>{related.length ? <div className="car-grid">{related.map(item => <CarCard key={item.id} car={item} />)}</div> : <p>В момента няма други публикувани автомобили от тази марка.</p>}</section><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /></section>
}
