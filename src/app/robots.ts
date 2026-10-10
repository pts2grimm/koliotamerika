import type { MetadataRoute } from 'next'
import { siteURL } from '@/lib/data'
export default function robots(): MetadataRoute.Robots { return { rules: process.env.SITE_INDEXABLE === 'true' ? { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] } : { userAgent: '*', disallow: '/' }, sitemap: `${siteURL()}/sitemap.xml` } }
