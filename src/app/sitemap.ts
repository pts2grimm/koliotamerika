import type { MetadataRoute } from 'next'
import { cms, siteURL } from '@/lib/data'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 if (process.env.SITE_INDEXABLE !== 'true') return []
 const payload = await cms(); const base = siteURL()
 const redirects = await payload.find({ collection: 'redirects', pagination: false, limit: 0, depth: 0 }); const redirectedPaths = new Set(redirects.docs.map(rule => rule.from))
 const output: MetadataRoute.Sitemap = ['/', '/avtomobili', '/kontakti', '/targove', '/kalkulator', '/blog'].map(path => ({ url: `${base}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.8 }))
 for (const collection of ['pages', 'cars'] as const) {
  let page = 1; let more = true
  while (more) { const result = await payload.find({ collection, overrideAccess: false, where: { 'seo.noIndex': { not_equals: true } }, limit: 100, page, depth: 0 }); output.push(...result.docs.filter(doc => !redirectedPaths.has(`/${doc.slug}`)).map(doc => ({ url: `${base}/${collection === 'cars' ? 'avtomobili/' : ''}${doc.slug}`, lastModified: new Date(doc.updatedAt), changeFrequency: 'weekly' as const, priority: 0.7 }))); more = result.hasNextPage; page++ }
 }
 return output
}
