import { Tracking } from '@/components/Tracking'
import { integrationSettings, publicIntegrationSettings } from '@/lib/integrations-server'
import './integrations.css'
import type { Metadata } from 'next'
import '@fontsource-variable/manrope'
import './styles.css'
import './showcase.css'
import './accounts.css'
import './experience.css'
import './theme.css'
import './landing.css'
import './filters.css'
import './blog-seo.css'
import './navigation.css'
import './legacy-gallery.css'
import './calculator-details.css'
import { themeInitScript } from '@/lib/theme'
import { AccountProvider } from '@/components/AccountProvider'
import { accountsEnabled, passwordRecoveryEnabled } from '@/lib/accounts-enabled'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { settings, siteURL } from '@/lib/data'
import { isPreview } from '@/lib/preview'
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const site = await settings()
  const integrations = await integrationSettings()
  return { verification: { ...(integrations?.googleVerification ? { google: integrations.googleVerification } : {}), other: { ...(integrations?.bingVerification ? { 'msvalidate.01': integrations.bingVerification } : {}), ...(integrations?.metaVerification ? { 'facebook-domain-verification': integrations.metaVerification } : {}) } }, metadataBase: new URL(siteURL()), title: { default: `${site.brand} — Автомобили от САЩ и Канада`, template: `%s | ${site.brand}` }, description: site.defaultDescription,
    robots: !isPreview() && process.env.SITE_INDEXABLE === 'true' ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', locale: 'bg_BG', siteName: site.brand, images: [{ url: '/images/hero.png', width: 1536, height: 1024, alt: 'Илюстрация на автомобил на пристанище' }] }, twitter: { card: 'summary_large_image' } }
}
export default async function Layout({ children }: { children: React.ReactNode }) {
 const site = await settings()
 const json = { '@context': 'https://schema.org', '@type': 'Organization', name: site.brand, url: siteURL(), ...(site.phone ? { telephone: site.phone } : {}), ...(site.email ? { email: site.email } : {}) }
 return <html lang="bg" data-scroll-behavior="smooth" suppressHydrationWarning><head><script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><AccountProvider enabled={accountsEnabled()} recovery={passwordRecoveryEnabled()}><a className="skip-link" href="#main">Към съдържанието</a><Header />{isPreview() && <div className="preview-notice" role="note">Демонстрационна версия · Разгледай сайта. Изпращането на запитвания е изключено.</div>}<main id="main">{children}</main><Footer /><Tracking config={await publicIntegrationSettings()} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }} /></AccountProvider></body></html>
}
