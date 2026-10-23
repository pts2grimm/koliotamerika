import { carCardSelect } from '@/lib/list-projections'
import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteLink as Link } from '@/components/SiteLink'
import type { Where } from 'payload'
import { ArrowRight, Search, X } from 'lucide-react'
import { cms } from '@/lib/data'
import { cataloguePath, catalogueQuery, type CatalogueParams } from '@/lib/catalogue-query'
import { CarCard } from '@/components/CarCard'
import { CTA } from '@/components/CTA'

type Props = { searchParams: Promise<CatalogueParams> }
const findCars = cache(async (q: string, budget: number, page: number, sort: string) => {
 const clauses: Where[] = []
 if (q) clauses.push({ title: { like: q } })
 if (budget > 0) clauses.push({ price: { less_than_equal: budget } })
 const cars = await (await cms()).find({ collection: 'cars', overrideAccess: false, select: carCardSelect, depth: 1, where: { and: clauses }, limit: 12, page, sort })
 if (page > 1 && page > cars.totalPages) notFound()
 return cars
})
async function catalogue(searchParams: Props['searchParams']) {
 const query = catalogueQuery(await searchParams)
 if (!query.validPage) notFound()
 const cars = await findCars(query.q, query.budget, query.page, query.sort)
 return { query, cars }
}
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
 const { query, cars } = await catalogue(searchParams)
 const title = 'Автомобили от САЩ и Канада' + (query.page > 1 ? ' — страница ' + query.page : '')
 const description = 'Разгледай публикуваните автомобили от САЩ и Канада. Потърси по марка, модел и бюджет и изпрати запитване за избрания автомобил.'
 const canonical = cataloguePath(query)
 return {
  title, description, alternates: { canonical },
  // Leave indexable pages to inherit the global preview/domain switch.
  ...(query.filtered || !cars.totalDocs ? { robots: { index: false, follow: true } } : {}),
  openGraph: { type: 'website', title, description, url: canonical, locale: 'bg_BG' },
 }
}
export default async function Cars({ searchParams }: Props) {
 const { query, cars } = await catalogue(searchParams)
 const { q, budget, page, sort } = query
 const pageLink = (n: number) => cataloguePath(query, n)
 return <><section className="page-heading container"><span className="eyebrow orange">КАТАЛОГ</span><h1>Автомобили от<br /><span className="muted">САЩ и Канада.</span></h1><p>Разгледай автомобилите или ни изпрати конкретния модел, който търсиш.</p></section><section className="container catalogue-list"><form className="catalogue-filter" action="/avtomobili"><label><span>Марка или модел</span><input name="q" defaultValue={q} placeholder="Напр. BMW X5" maxLength={80} /></label><label><span>Максимален бюджет (€)</span><input type="number" name="budget" min="0" step="100" defaultValue={budget || ''} placeholder="Без ограничение" /></label><label><span>Подреди по</span><select name="sort" defaultValue={sort}><option value="-createdAt">Най-нови</option><option value="price">Цена: възходяща</option><option value="-price">Цена: низходяща</option><option value="-year">Година</option></select></label><button className="button button-dark"><Search size={18} />Търси</button></form><div className="results-count"><span>{cars.totalDocs} {cars.totalDocs === 1 ? 'автомобил' : 'автомобила'}</span>{(q || budget > 0) && <Link href="/avtomobili">Изчисти филтрите <X size={14} /></Link>}</div>{cars.docs.length ? <div className="car-grid">{cars.docs.map(car => <CarCard key={car.id} car={car} />)}</div> : <div className="empty-state"><Search size={34} strokeWidth={1.4} /><h2>{q || budget ? 'Няма автомобили по тези критерии.' : 'Каталогът очаква новите предложения.'}</h2><p>Имаш конкретен модел наум? Изпрати ни запитване.</p><Link className="button button-orange" href="/kontakti">Търся автомобил <ArrowRight size={18} /></Link></div>}{cars.totalPages > 1 && <nav className="pagination" aria-label="Страници на каталога">{cars.hasPrevPage && <Link className="button button-outline" href={pageLink(page - 1)}>Предишна</Link>}<span>Страница {page} от {cars.totalPages}</span>{cars.hasNextPage && <Link className="button button-outline" href={pageLink(page + 1)}>Следваща</Link>}</nav>}</section><CTA /></>
}
