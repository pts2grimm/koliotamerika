import { SiteLink as Link } from '@/components/SiteLink'
import type { Where } from 'payload'
import { ArrowRight, Search, X } from 'lucide-react'
import { cms } from '@/lib/data'
import { CarCard } from '@/components/CarCard'
import { CTA } from '@/components/CTA'
export const metadata = { title: 'Автомобили', description: 'Разгледайте публикуваните автомобили и изпратете запитване за вашия следващ автомобил от САЩ или Канада.', alternates: { canonical: '/avtomobili' } }
export default async function Cars({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams
 const q = typeof params.q === 'string' ? params.q.slice(0, 80).trim() : ''
 const budget = Number(params.budget) || 0
 const page = Math.min(10000, Math.max(1, Math.floor(Number(params.page) || 1)))
 const sort = typeof params.sort === 'string' && ['price', '-price', '-year'].includes(params.sort) ? params.sort : '-createdAt'
 const clauses: Where[] = []
 if (q) clauses.push({ title: { like: q } })
 if (budget > 0) clauses.push({ price: { less_than_equal: budget } })
 const cars = await (await cms()).find({ collection: 'cars', overrideAccess: false, where: { and: clauses }, limit: 12, page, sort })
 function pageLink(n: number) { return `/avtomobili?${new URLSearchParams({ q, budget: budget ? String(budget) : '', sort, page: String(n) })}` }
 return <><section className="page-heading container"><span className="eyebrow orange">КАТАЛОГ</span><h1>Намери своята<br /><span className="muted">следваща посока.</span></h1><p>Разгледай автомобилите или ни изпрати конкретния модел, който търсиш.</p></section><section className="container catalogue-list"><form className="catalogue-filter" action="/avtomobili"><label><span>Марка или модел</span><input name="q" defaultValue={q} placeholder="Напр. BMW X5" maxLength={80} /></label><label><span>Максимален бюджет (€)</span><input type="number" name="budget" min="0" step="100" defaultValue={budget || ''} placeholder="Без ограничение" /></label><label><span>Подреди по</span><select name="sort" defaultValue={sort}><option value="-createdAt">Най-нови</option><option value="price">Цена: възходяща</option><option value="-price">Цена: низходяща</option><option value="-year">Година</option></select></label><button className="button button-dark"><Search size={18} />Търси</button></form><div className="results-count"><span>{cars.totalDocs} {cars.totalDocs === 1 ? 'автомобил' : 'автомобила'}</span>{(q || budget > 0) && <Link href="/avtomobili">Изчисти филтрите <X size={14} /></Link>}</div>{cars.docs.length ? <div className="car-grid">{cars.docs.map(car => <CarCard key={car.id} car={car} />)}</div> : <div className="empty-state"><Search size={34} strokeWidth={1.4} /><h2>{q || budget ? 'Няма автомобили по тези критерии.' : 'Каталогът очаква новите предложения.'}</h2><p>Имаш конкретен модел наум? Изпрати ни запитване.</p><Link className="button button-orange" href="/kontakti">Търся автомобил <ArrowRight size={18} /></Link></div>}{cars.totalPages > 1 && <nav className="pagination" aria-label="Страници на каталога">{cars.hasPrevPage && <Link className="button button-outline" href={pageLink(page - 1)}>Предишна</Link>}<span>Страница {page} от {cars.totalPages}</span>{cars.hasNextPage && <Link className="button button-outline" href={pageLink(page + 1)}>Следваща</Link>}</nav>}</section><CTA /></>
}
