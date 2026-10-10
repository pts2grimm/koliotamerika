import type { Metadata } from 'next'
import '@fontsource-variable/manrope'
import './styles.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { settings, siteURL } from '@/lib/data'
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const site = await settings()
  return { metadataBase: new URL(siteURL()), title: { default: `${site.brand} — Автомобили от САЩ и Канада`, template: `%s | ${site.brand}` }, description: site.defaultDescription,
    robots: process.env.SITE_INDEXABLE === 'true' ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', locale: 'bg_BG', siteName: site.brand, images: [{ url: '/images/hero.png', width: 1536, height: 1024, alt: 'Илюстрация на автомобил на пристанище' }] }, twitter: { card: 'summary_large_image' } }
}
export default async function Layout({ children }: { children: React.ReactNode }) {
 const site = await settings()
 const json = { '@context': 'https://schema.org', '@type': 'Organization', name: site.brand, url: siteURL(), ...(site.phone ? { telephone: site.phone } : {}), ...(site.email ? { email: site.email } : {}) }
 return <html lang="bg" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">Към съдържанието</a><Header /><main id="main">{children}</main><Footer /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }} /></body></html>
}
