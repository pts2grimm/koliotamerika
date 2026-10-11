import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { blogPage, blogPath } from '@/lib/blog-seo'
import Image from 'next/image'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight } from 'lucide-react'
import { cms, mediaUrl } from '@/lib/data'
const getArticles = cache(async (page: number) => {
 const articles = await (await cms()).find({ collection: 'pages', overrideAccess: false, where: { kind: { equals: 'article' } }, sort: '-publishedAt', limit: 12, page })
 if (page > 1 && page > articles.totalPages) notFound()
 return articles
})
type BlogProps = { searchParams: Promise<{ page?: string | string[] }> }
export async function generateMetadata({ searchParams }: BlogProps): Promise<Metadata> {
 const page = blogPage((await searchParams).page)
 if (!page) notFound()
 await getArticles(page)
 return { title: 'Блог за внос на коли от САЩ' + (page > 1 ? ' — страница ' + page : ''),
  description: 'Съвети, документи, проверки и новини за покупка и внос на автомобили от Америка.',
  alternates: { canonical: blogPath(page) }, openGraph: { type: 'website', url: blogPath(page), locale: 'bg_BG' } }
}
export default async function Blog({ searchParams }: BlogProps) {
 const page = blogPage((await searchParams).page)
 if (!page) notFound()
 const articles = await getArticles(page)
 const featured = page === 1 ? articles.docs[0] : undefined
 const rest = featured ? articles.docs.slice(1) : articles.docs
 const date = (value?: string | null) => value ? new Intl.DateTimeFormat('bg-BG', { dateStyle: 'long', timeZone: 'Europe/Sofia' }).format(new Date(value)) : 'ПОЛЕЗНО'
 return <div className="landing-page landing-journal"><div className="container"><nav className="landing-breadcrumbs" aria-label="Път до страницата"><Link href="/">Начало</Link><span aria-hidden="true">/</span><span aria-current="page">Блог</span></nav></div><section className="container journal-heading"><div><span className="eyebrow orange">ЖУРНАЛ / КОЛИ ОТ АМЕРИКА</span><h1>Блог за коли<br />от Америка.</h1></div><p>Полезни съвети, новини и отговори за автомобилите от Америка. За по-уверен избор на всяка стъпка.</p></section>
 {featured && <section className="container journal-featured"><Link href={'/' + featured.slug}><div className="journal-featured-image"><Image src={mediaUrl(featured.image) || featured.legacyImage || '/images/legacy/wp-32.webp'} alt={featured.title} fill priority sizes="(max-width:900px) 100vw,60vw" /></div><div className="journal-featured-copy"><span className="eyebrow orange">ПОСЛЕДНО В БЛОГА · {date(featured.publishedAt)}</span><h2>{featured.title}</h2><p>{featured.intro.slice(0, 220)}{featured.intro.length > 220 ? '…' : ''}</p><span className="text-link">Прочети статията<ArrowUpRight size={20} /></span></div></Link></section>}
 <section className="container blog-section">{rest.length > 0 && <div className="journal-list-heading"><h2>{featured ? 'Още от журнала' : 'Статии и съвети'}</h2><span>{articles.totalDocs} публикации</span></div>}<div className="blog-grid">{rest.map(article => { const image = mediaUrl(article.image) || article.legacyImage; return <Link href={'/' + article.slug} className="blog-card" key={article.id}>{image && <div className="blog-image"><Image src={image} alt={article.title} fill sizes="(max-width:700px) 100vw,(max-width:1100px) 50vw,33vw" /></div>}<div><span className="eyebrow orange">{date(article.publishedAt)}</span><h2>{article.title}</h2><p>{article.intro.slice(0, 160)}{article.intro.length > 160 ? '…' : ''}</p><span className="text-link">Прочети повече<ArrowUpRight size={17} /></span></div></Link> })}</div>{articles.totalPages > 1 && <nav className="pagination" aria-label="Страници на блога">{articles.hasPrevPage && <Link className="button button-outline" href={blogPath(page - 1)}>Предишна</Link>}<span>{page} / {articles.totalPages}</span>{articles.hasNextPage && <Link className="button button-outline" href={blogPath(page + 1)}>Следваща</Link>}</nav>}</section></div>
}
