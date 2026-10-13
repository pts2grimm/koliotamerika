import { LoadingIndicator } from './LoadingIndicator'

export function AuctionCatalogueLoading({ powersports = false, archive = false }: { powersports?: boolean; archive?: boolean }) {
 const label = archive ? 'Зареждаме архива…' : powersports ? 'Зареждаме търговете за мотори и ATV…' : 'Зареждаме търговете…'
 return <section className="container catalogue-loading">
  <LoadingIndicator>{label}</LoadingIndicator>
  <div className="catalogue-skeleton-layout" aria-hidden="true">
   <div className="skeleton-filter"><div className="loading-skeleton skeleton-line skeleton-title" />{Array.from({length:5},(_,i)=><div className="loading-skeleton skeleton-control" key={i} />)}</div>
   <div className="skeleton-grid">{Array.from({length:4},(_,i)=><div className="skeleton-card" key={i}>
    <div className="loading-skeleton skeleton-photo" />
    <div className="skeleton-card-body"><div className="loading-skeleton skeleton-line skeleton-title" /><div className="loading-skeleton skeleton-line" /><div className="loading-skeleton skeleton-line skeleton-short" /><div className="loading-skeleton skeleton-control" /></div>
   </div>)}</div>
  </div>
 </section>
}
