import { Link } from '@payloadcms/ui'
export function AdminAnalyticsTabs({ active, root }: { active: 'overview' | 'catalog' | 'database'; root: string }) {
  return <nav className="koa-analytics-tabs" aria-label="Отчети">
    <Link href={root} aria-current={active === 'overview' ? 'page' : undefined}>Обзор и бисквитки</Link>
    <Link href={root + '/catalog-activity'} aria-current={active === 'catalog' ? 'page' : undefined}>API лог — каталог</Link>
    <Link href={root + '/database-traffic'} aria-current={active === 'database' ? 'page' : undefined}>Трафик на базата</Link>
  </nav>
}
