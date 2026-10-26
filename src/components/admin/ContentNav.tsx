'use client'

import { Link, NavGroup, useAuth, useConfig, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

export function ContentNav() {
  const { user } = useAuth()
  const { config } = useConfig()
  const { navOpen } = useNav()
  const pathname = usePathname()
  if (user?.collection !== 'users') return null
  const root = config.routes.admin
  return <>
    <div className="koa-nav-brand">
      <span className="koa-nav-brand__mark" aria-hidden="true">КA</span>
      <span><strong>Коли от Америка</strong><small>Управление на сайта</small></span>
    </div>
    <Link href={root} id="koa-nav-overview" className="nav__link koa-overview-link"
      tabIndex={navOpen ? undefined : -1}
      aria-current={pathname === root || pathname === root + '/' ? 'page' : undefined}>
      <span className="nav__link-label">Обзор и аналитика</span>
    </Link>
    <Link href={root + '/catalog-activity'} id="koa-nav-catalog-activity" className="nav__link"
      tabIndex={navOpen ? undefined : -1} aria-current={pathname === root + '/catalog-activity' ? 'page' : undefined}>
      <span className="nav__link-label">API лог — каталог</span>
    </Link>
    <Link href={root + '/database-traffic'} id="koa-nav-database-traffic" className="nav__link"
      tabIndex={navOpen ? undefined : -1} aria-current={pathname === root + '/database-traffic' ? 'page' : undefined}>
      <span className="nav__link-label">Трафик на базата</span>
    </Link>
    <NavGroup label="Съдържание" isOpen>
      {[['globals/homepage', 'Начална страница'], ['site-pages', 'Страници'], ['blog-posts', 'Блог'], ['social', 'Facebook публикации']].map(([path, label]) =>
        <Link key={path} id={`koa-nav-${path}`} href={`${root}/${path}`} className="nav__link"
          tabIndex={navOpen ? undefined : -1}
          aria-current={pathname === `${root}/${path}` ? 'page' : undefined}>
          <span className="nav__link-label">{label}</span>
        </Link>,
      )}
    </NavGroup>
  </>
}
