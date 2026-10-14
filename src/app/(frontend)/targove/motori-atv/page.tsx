import type { Metadata } from 'next'
import { AuctionCatalogue } from '@/components/AuctionCatalogue'
import { auctionResultsURL, type AuctionQuery } from '@/lib/auction-filters'
import { sectionFilters, auctionSectionPath } from '@/lib/auction-sections'
import { isPreview } from '@/lib/preview'
import { auctionProviderName } from '@/lib/auctions'

type Props = { searchParams: Promise<AuctionQuery> }
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
 const input = await searchParams
 const filters = sectionFilters(input,'powersports')
 const page = Math.max(1,Math.min(10000,Math.floor(Number(input.pagenum)||1)))
 const title = 'Търгове за мотори и ATV от Америка — Copart и IAAI' + (page > 1 ? ` — страница ${page}` : '')
 const description = 'Мотори, ATV и UTV на търг от САЩ и Канада в Copart и IAAI. Филтрирай по марка, модел и година и изпрати запитване за конкретен лот.'
 const canonical = auctionResultsURL(filters,page,auctionSectionPath('powersports',false))
 const indexable = !isPreview() && process.env.SITE_INDEXABLE === 'true' && auctionProviderName() === 'eridan'
 return { title,description,alternates:{canonical},openGraph:{title,description,url:canonical,type:'website'},robots:{index:indexable && !Object.keys(filters).length && !input.q && page===1,follow:indexable} }
}
export default function PowersportsAuctions(props: Props) {
 return <AuctionCatalogue {...props} section="powersports" />
}
