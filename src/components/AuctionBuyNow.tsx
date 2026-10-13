import { isAuctionClosed } from '@/lib/auction-lifecycle'
import type { AuctionCar } from '@/lib/auction-providers/types'
import { auctionCurrency } from '@/lib/auctions'

export function AuctionBuyNow({ car }: { car: AuctionCar }) {
 if (isAuctionClosed(car) || !Number.isFinite(car.buy_now) || !car.buy_now || car.buy_now <= 0 ||
     !car.currency || !['USD', 'CAD', 'EUR', 'BGN'].includes(car.currency.toUpperCase()) ||
     car.auction_status && car.auction_status !== 'active') return null
 return <div className="auction-buy-now"><div>
  <span className="price-label">Купи сега (Buy Now)</span>
  <strong>{auctionCurrency(car.buy_now, car.currency)}</strong>
  <span className="price-disclaimer">Без разходите за внос. Цената и наличността се потвърждават преди покупка.</span>
 </div></div>
}
