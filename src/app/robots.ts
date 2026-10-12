import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { siteURL } from '@/lib/data'
import { requestIsIndexable } from '@/lib/indexing-policy'
export const dynamic = 'force-dynamic'
export default async function robots(): Promise<MetadataRoute.Robots> {
 const indexable = requestIsIndexable((await headers()).get('host'))
 return {
  rules: indexable ? { userAgent: '*', allow: ['/', '/api/media/file/'], disallow: ['/admin', '/api/'] } : { userAgent: '*', disallow: '/' },
  ...(indexable ? { sitemap: `${siteURL()}/sitemap.xml` } : {}),
 }
}
