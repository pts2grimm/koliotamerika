import { BlogArticle } from '@/components/BlogArticle'
import { editorialImage } from '@/lib/editorial-images'
import { CookiePolicy } from '@/components/CookiePolicy'
import { servicesReviewKey } from '@/lib/services-review-key'
import { pricingDetailsKey } from '@/lib/pricing-details-key'
import { contentReviewKey } from '@/lib/content-review-key'
import { SiteLink as Link } from '@/components/SiteLink'
import { articleStructuredData, isoDate } from '@/lib/blog-seo'
import { legacyRedirect } from '@/lib/legacy-redirects'
import { archiveContains, legacyArchives } from '@/lib/legacy-archives'
import type { Metadata } from 'next'
import Image from 'next/image'
import { LegacyExamples } from '@/components/LegacyExamples'
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
 const cover = editorialImage(page.slug, mediaUrl(page.image), page.legacyImage)
 const seoImage = mediaUrl(page.seo?.image)
 const image = seoImage || cover.src
 const title = page.seo?.title || page.title
 const description = page.seo?.description || page.intro.slice(0, 160)
 const published = isoDate(page.publishedAt)
 return {
  title: page.seo?.title ? { absolute: page.seo.title } : page.title,
  description, alternates: { canonical: '/' + page.slug },
  ...(page.seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  openGraph: { title, description, url: '/' + page.slug, locale: 'bg_BG',
   ...(page.kind === 'article' ? { type: 'article', ...(published ? { publishedTime: published } : {}) } : { type: 'website' }),
   ...(image ? { images: [{ url: image, alt: seoImage ? imageAlt(page.seo?.image, page.title) : imageAlt(page.image, cover.artwork?.alt || page.title) }] } : {}),
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
 const cover = editorialImage(page.slug, mediaUrl(page.image), page.legacyImage)
 const image = cover.src
 const article = page.kind === 'article'
 const site = article ? await settings() : undefined
 const published = isoDate(page.publishedAt)
 const detailReview = article ? (await payload.find({collection:'payload-kv',depth:0,limit:1,where:{key:{equals:pricingDetailsKey(page.slug)}}})).docs[0]?.data as {appliedAt?:string;applied?:{body?:unknown}} | undefined : undefined
 const review = article ? (await payload.find({collection:'payload-kv',depth:0,limit:1,where:{key:{equals:contentReviewKey(page.slug)}}})).docs[0]?.data as {appliedAt?:string;applied?:{body?:unknown}} | undefined : undefined
 const servicesReview = article ? (await payload.find({collection:'payload-kv',depth:0,limit:1,where:{key:{equals:servicesReviewKey(page.slug)}}})).docs[0]?.data as {appliedAt?:string;applied?:{body?:unknown}} | undefined : undefined
 const reviewedAt = servicesReview?.applied?.body ? isoDate(servicesReview.appliedAt) : detailReview?.applied?.body ? isoDate(detailReview.appliedAt) : review?.applied?.body ? isoDate(review.appliedAt) : undefined
 const topics = article ? legacyArchives.filter(archive => archive.kind === 'tag' && archiveContains(archive, page)) : []
 const more = article ? (await payload.find({ collection: 'pages', overrideAccess: false, where: { and: [{ kind: { equals: 'article' } }, { id: { not_equals: page.id } }] }, sort: '-publishedAt', limit: 3 })).docs : []
 // Keep the existing article record, URL, metadata and archive links; only its presentation changes.
 if (article && page.slug === 'morski-transport-na-avtomobili-ot-sasht') return <LandingPage page={page} editorial={{
  structuredData: articleStructuredData(page, siteURL(), site!.brand, image || undefined, reviewedAt),
  metadata: <div className="article-meta"><span>Публикация в {site!.brand}</span>{published && <time dateTime={published}>{new Intl.DateTimeFormat('bg-BG', { dateStyle: 'long', timeZone: 'Europe/Sofia' }).format(new Date(published))}</time>}{reviewedAt && <span>Прегледано на <time dateTime={reviewedAt}>{new Intl.DateTimeFormat('bg-BG', { dateStyle: 'long', timeZone: 'Europe/Sofia' }).format(new Date(reviewedAt))}</time></span>}</div>,
 }}>
  {topics.length > 0 && <aside className="container article-more"><h2>Теми на статията</h2><ul>{topics.map(topic => <li key={topic.path}><Link href={topic.path}>{topic.label}</Link></li>)}</ul></aside>}
  {more.length > 0 && <aside className="container article-more"><h2>Още от блога</h2><ul>{more.map(item => <li key={item.id}><Link href={'/' + item.slug}>{item.title}</Link></li>)}</ul><Link className="text-link" href="/blog">Всички статии</Link></aside>}
 </LandingPage>
 if (article) return <>
  <BlogArticle page={page} brand={site!.brand} reviewedAt={reviewedAt} topics={topics} more={more} />
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(page, siteURL(), site!.brand, image || undefined, reviewedAt)).replace(/</g, '\\u003c') }} />
  <CTA />
 </>
 return <>
  <section className="page-heading container"><span className="eyebrow orange">{page.eyebrow || 'КОЛИ ОТ АМЕРИКА'}</span><h1>{page.title}</h1><p>{page.intro}</p></section>
  {image && <div className="container editorial-image"><Image src={image} alt={imageAlt(page.image, page.title)} width={1400} height={700} sizes="(max-width: 1400px) 100vw, 1400px" preload /></div>}
  <article className="article-body container">
   {page.body && <EditorialContent data={page.body} />}
   {page.sections?.map((section, i) => <section key={section.id || i}><h2>{section.heading}</h2>{section.body.split(/\n\s*\n/).map((p, j) => <p key={j}>{p}</p>)}</section>)}
   {['poveritelnost','zashtita-na-lichni-danni'].includes(page.slug) && <CookiePolicy />}
  </article>
  <LegacyExamples slug={page.slug} />
 </>
}
