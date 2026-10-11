import type { MetadataRoute } from 'next'
import { siteURL } from '@/lib/data'
import { isPreview } from '@/lib/preview'
export const dynamic = 'force-dynamic'
export default function robots(): MetadataRoute.Robots { return { rules: !isPreview() && process.env.SITE_INDEXABLE === 'true' ? { userAgent: '*', allow: ['/', '/api/media/file/'], disallow: ['/admin', '/api/'] } : { userAgent: '*', disallow: '/' }, sitemap: `${siteURL()}/sitemap.xml` } }
