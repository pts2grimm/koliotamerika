import type { Metadata } from 'next'
import Image from 'next/image'
import { EditorialContent } from '@/components/EditorialContent'
import { ImportCalculator } from '@/components/ImportCalculator'
import { calculatorSettings } from '@/lib/calculator'
import { cache } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import { cms, imageAlt, mediaUrl } from '@/lib/data'
import { CTA } from '@/components/CTA'
type Props = { params: Promise<{ slug: string[] }> }
const getPage = cache(async (slug: string) => (await (await cms()).find({ collection: 'pages', where: { slug: { equals: slug } }, overrideAccess: false, limit: 1 })).docs[0])
export async function generateMetadata({ params }: Props): Promise<Metadata> { const slug = (await params).slug.join('/'); const page = await getPage(slug); if (!page) return {}; const image = mediaUrl(page.seo?.image) || mediaUrl(page.image); return { title: page.seo?.title || page.title, description: page.seo?.description || page.intro.slice(0, 160), alternates: { canonical: `/${page.slug}` }, ...(page.seo?.noIndex ? { robots: { index: false, follow: true } } : {}), openGraph: { title: page.seo?.title || page.title, description: page.seo?.description || page.intro.slice(0, 160), url: `/${page.slug}`, ...(image ? { images: [image] } : {}) } } }
export default async function ContentPage({ params }: Props) {
 const slug = (await params).slug.join('/')
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
 const image = mediaUrl(page.image) || page.legacyImage
 return <><section className="page-heading container"><span className="eyebrow orange">{page.eyebrow || 'КОЛИ ОТ АМЕРИКА'}</span><h1>{page.title}</h1><p>{page.intro}</p></section>{image && <div className="container editorial-image"><Image src={image} alt={imageAlt(page.image, page.title)} width={1400} height={700} priority /></div>}<article className="article-body container">{page.body && <EditorialContent data={page.body} />}{page.sections?.map((section, i) => <section key={section.id || i}><h2>{section.heading}</h2>{section.body.split(/\n\s*\n/).map((p, j) => <p key={j}>{p}</p>)}</section>)}</article>{page.slug === 'vnos-na-koli-ot-usa' && <ImportCalculator config={await calculatorSettings()} />}{!['poveritelnost','zashtita-na-lichni-danni','obshti-usloviya'].includes(page.slug) && <CTA />}</>
}
