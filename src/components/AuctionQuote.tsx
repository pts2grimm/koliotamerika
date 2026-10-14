import { cache } from 'react'
import { cms, money } from '@/lib/data'
import { ShareAuction } from './ShareAuction'

const quotePrice = cache(async (lot: string, site: string) => {
 try {
  const payload = await cms()
  const result = await payload.find({
   collection: 'auction-quotes',
   where: { and: [{ lot: { equals: lot } }, { site: { equals: site } }, { published: { equals: true } }] },
   limit: 1, depth: 0,
  })
  return result.docs[0]?.priceEUR
 } catch {
  console.warn('[auctions] Optional published quote lookup failed')
  return undefined
 }
})

export async function AuctionQuotePrice({ lot, site }: { lot: string; site: string }) {
 const price = await quotePrice(lot, site)
 return price == null ? null : <p className="quote-price">{money(price)}<small>Ориентировъчна цена до България</small></p>
}

export async function AuctionQuoteShare({ lot, site, title, text }: { lot: string; site: string; title: string; text: string }) {
 const price = await quotePrice(lot, site)
 return <ShareAuction title={title} text={text + (price == null ? '' : '\nОриентировъчна цена до България: ' + money(price))} />
}
