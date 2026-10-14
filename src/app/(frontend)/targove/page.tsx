import { sectionFilters } from '@/lib/auction-sections'
import type { Metadata } from 'next'
import { AuctionCatalogue } from '@/components/AuctionCatalogue'
import { auctionResultsURL, readAuctionFilters, type AuctionQuery } from '@/lib/auction-filters'
import { isPreview } from '@/lib/preview'

type Props = { searchParams: Promise<AuctionQuery> }
const defaultTitle = 'Търгове за коли от Америка — Copart и IAAI'
const defaultDescription = 'Разгледай търгове за коли от Америка в Copart и IAAI. Избери марка, модел и година, сравни снимки и щети и планирай вноса до България.'
const getPage = (input: AuctionQuery) => Math.max(1, Math.min(10000, Math.floor(Number(input.pagenum) || 1)))

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const input = await searchParams
  const filters = sectionFilters(input,'cars')
  const page = getPage(input)
  const vehicle = [filters.make, filters.model].filter(Boolean).join(' ')
  const title = vehicle ? `${vehicle} на търг от Америка${page > 1 ? ` — страница ${page}` : ''}` : `${defaultTitle}${page > 1 ? ` — страница ${page}` : ''}`
  const description = vehicle ? `Разгледай ${vehicle} от Copart и IAAI. Сравни снимки, година, пробег и щети и поискай индивидуална оферта за внос до България.` : defaultDescription
  const indexable = !isPreview() && process.env.SITE_INDEXABLE === 'true'
  const filtered = Object.keys(filters).length > 0 || Boolean(input.q) || page > 1
  const canonical = auctionResultsURL(filters, page)
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: 'website' }, robots: { index: indexable && !filtered, follow: indexable } }
}

export default function Auctions(props: Props) { return <AuctionCatalogue {...props} /> }
