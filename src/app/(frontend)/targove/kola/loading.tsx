import { SiteLink as Link } from '@/components/SiteLink'

export default function LoadingAuction() {
 return <section className="container car-detail auction-detail" aria-busy="true">
  <Link className="text-link back-link" href="/targove">Към търговете</Link>
  <div className="detail-grid">
   <div className="detail-photo" aria-hidden="true"><span className="image-placeholder">Зареждаме снимките…</span></div>
   <div className="detail-summary"><span className="eyebrow orange">АВТОМОБИЛ НА ТЪРГ</span><p role="status">Зареждаме автомобила…</p></div>
  </div>
 </section>
}
