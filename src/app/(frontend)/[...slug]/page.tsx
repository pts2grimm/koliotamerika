import { SiteLink as Link } from '@/components/SiteLink'
import { articleStructuredData, isoDate } from '@/lib/blog-seo'
import { legacyRedirect } from '@/lib/legacy-redirects'
import type { Metadata } from 'next'
import Image from 'next/image'
import { EditorialContent } from '@/components/EditorialContent'
import { ImportCalculator } from '@/components/ImportCalculator'
import { calculatorSettings } from '@/lib/calculator'
import { cache } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import { cms, imageAlt, mediaUrl, settings, siteURL } from '@/lib/data'
import { LandingPage } from '@/components/LandingPage'
import { CTA } from '@/components/CTA'
type Props = { params: Promise<{ slug: string[] }> }
const getPage = cache(async (slug: string) => (await (await cms()).find({ collection: 'pages', where: { slug: { equals: slug } }, overrideAccess: false, limit: 1 })).docs[0])
export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const slug = (await params).slug.join('/')
 const redirect = legacyRedirect('/' + slug)
 if (redirect) permanentRedirect(redirect)
 const page = await getPage(slug)
 if (!page) return { robots: { index: false, follow: false } }
 const image = mediaUrl(page.seo?.image) || mediaUrl(page.image) || page.legacyImage
 const title = page.seo?.title || page.title
 const description = page.seo?.description || page.intro.slice(0, 160)
 const published = isoDate(page.publishedAt)
 return {
  title: page.seo?.title ? { absolute: page.seo.title } : page.title,
  description, alternates: { canonical: '/' + page.slug },
  ...(page.seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  openGraph: { title, description, url: '/' + page.slug, locale: 'bg_BG',
   ...(page.kind === 'article' ? { type: 'article', ...(published ? { publishedTime: published } : {}) } : { type: 'website' }),
   ...(image ? { images: [{ url: image, alt: imageAlt(page.image, page.title) }] } : {}),
  },
  twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image] } : {}) },
 }
}
export default async function ContentPage({ params }: Props) {
 const slug = (await params).slug.join('/')
 const legacy = legacyRedirect('/' + slug)
 if (legacy) permanentRedirect(legacy)
 const payload = await cms()
 // Resolve redirect chains without allowing loops or external destinations.
 let target = `/${slug}`; const seen = new Set<string>()
 for (let i = 0; i < 10; i++) {
   if (seen.has(target)) notFound(); seen.add(target)
   const rule = (await payload.find({ collection: 'redirects', where: { from: { equals: target } }, limit: 1 })).docs[0]
   if (!rule) break
   if (!rule.to.startsWith('/') || rule.to.startsWith('//')) notFound()
   target = rule.to
   if (i === 9) notFound()
 }
 if (target !== `/${slug}`) permanentRedirect(target)
 const page = await getPage(slug); if (!page) notFound()
 const legal = ['poveritelnost', 'zashtita-na-lichni-danni', 'obshti-usloviya'].includes(page.slug)
 if (page.kind !== 'article' && !legal) return <LandingPage page={page}>{page.slug === 'vnos-na-koli-ot-usa' && <ImportCalculator config={await calculatorSettings()} />}</LandingPage>
 const image = mediaUrl(page.image) || page.legacyImage
 const article = page.kind === 'article'
 const site = article ? await settings() : undefined
 const published = isoDate(page.publishedAt)
 const more = article ? (await payload.find({ collection: 'pages', overrideAccess: false, where: { and: [{ kind: { equals: 'article' } }, { id: { not_equals: page.id } }] }, sort: '-publishedAt', limit: 3 })).docs : []
 return <>{article && <div className="container"><nav className="landing-breadcrumbs" aria-label="Път до страницата"><Link href="/">Начало</Link><span aria-hidden="true">/</span><Link href="/blog">Блог</Link><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></nav></div>}<section className="page-heading container"><span className="eyebrow orange">{page.eyebrow || 'КОЛИ ОТ АМЕРИКА'}</span><h1>{page.title}</h1><p>{page.intro}</p>{article && <div className="article-meta"><span>{page.sourceURL ? 'Публикация в' : 'От редакцията на'} {site!.brand}</span>{published && <time dateTime={published}>{new Intl.DateTimeFormat('bg-BG', { dateStyle: 'long', timeZone: 'Europe/Sofia' }).format(new Date(published))}</time>}</div>}</section>{image && <div className="container editorial-image"><Image src={image} alt={imageAlt(page.image, page.title)} width={1400} height={700} priority /></div>}<article className="article-body container">{page.body && <EditorialContent data={page.body} />}{page.sections?.map((section, i) => <section key={section.id || i}><h2>{section.heading}</h2>{section.body.split(/\n\s*\n/).map((p, j) => <p key={j}>{p}</p>)}</section>)}</article>{article && <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(page, siteURL(), site!.brand, image || undefined)).replace(/</g, '\\u003c') }} />{more.length > 0 && <aside className="container article-more"><h2>Още от блога</h2><ul>{more.map(item => <li key={item.id}><Link href={'/' + item.slug}>{item.title}</Link></li>)}</ul><Link className="text-link" href="/blog">Всички статии</Link></aside>}</>}{page.slug === 'vnos-na-koli-ot-usa' && <ImportCalculator config={await calculatorSettings()} />}{!['poveritelnost','zashtita-na-lichni-danni','obshti-usloviya'].includes(page.slug) && <CTA />}</>
}
