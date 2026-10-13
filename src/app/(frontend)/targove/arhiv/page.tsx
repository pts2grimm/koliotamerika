import type { Metadata } from 'next'
import { AuctionCatalogue } from '@/components/AuctionCatalogue'
import { isPreview } from '@/lib/preview'
import type { AuctionQuery } from '@/lib/auction-filters'

export const metadata: Metadata = {
 title: 'Архив на продадените автомобили',
 description: 'Архив на обяви, отбелязани като продадени от доставчика. Тези автомобили не са достъпни за покупка.',
 robots: { index: !isPreview() && process.env.SITE_INDEXABLE === 'true', follow: !isPreview() && process.env.SITE_INDEXABLE === 'true' },
 alternates: { canonical: '/targove/arhiv' },
}
export default function AuctionArchive({ searchParams }: { searchParams: Promise<AuctionQuery> }) {
 return <AuctionCatalogue searchParams={searchParams} archive />
}
