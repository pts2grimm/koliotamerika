import { SiteLink as Link } from '@/components/SiteLink'
import { LoadingIndicator } from '@/components/LoadingIndicator'

export default function LoadingAuction() {
 return <section className="container car-detail auction-detail">
  <Link className="text-link back-link" href="/targove">Към търговете</Link>
  <div className="detail-grid">
   <div className="loading-skeleton skeleton-detail-photo" aria-hidden="true" />
   <div className="detail-summary"><span className="eyebrow orange">АВТОМОБИЛ НА ТЪРГ</span><LoadingIndicator>Зареждаме автомобила…</LoadingIndicator>
    <div className="skeleton-detail-lines" aria-hidden="true"><div className="loading-skeleton skeleton-line skeleton-title" /><div className="loading-skeleton skeleton-control" /><div className="loading-skeleton skeleton-line skeleton-short" /><div className="loading-skeleton skeleton-control" /></div>
   </div>
  </div>
 </section>
}
