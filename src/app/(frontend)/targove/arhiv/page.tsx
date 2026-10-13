import type { Metadata } from 'next'
import { AuctionCatalogue } from '@/components/AuctionCatalogue'
import { isPreview } from '@/lib/preview'
import { auctionResultsURL, readAuctionFilters, type AuctionQuery } from '@/lib/auction-filters'

type Props = { searchParams: Promise<AuctionQuery> }
export async function generateMetadata({searchParams}: Props): Promise<Metadata> {
 const input = await searchParams
 const filters = readAuctionFilters(input)
 const page = Math.max(1, Math.min(10000, Math.floor(Number(input.pagenum) || 1)))
 const indexable = !isPreview() && process.env.SITE_INDEXABLE === 'true'
 return {
  title: 'Архив на търговете' + (page > 1 ? ` — страница ${page}` : ''),
  description: 'Архив на автомобили с минала дата на търга. VIN, снимки и резултат от продажбата, когато е потвърден от доставчика.',
  robots: { index: indexable && !Object.keys(filters).length && !input.q, follow: indexable },
  alternates: { canonical: auctionResultsURL(filters,page,'/targove/arhiv') },
 }
}
export default function AuctionArchive({ searchParams }: Props) {
 return <AuctionCatalogue searchParams={searchParams} archive />
}
