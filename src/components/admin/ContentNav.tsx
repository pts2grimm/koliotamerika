'use client'

import { Link, NavGroup, useAuth, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

export function ContentNav() {
  const { user } = useAuth()
  const { config } = useConfig()
  const pathname = usePathname()
  if (user?.collection !== 'users') return null
  const root = config.routes.admin
  return <NavGroup label="Съдържание" isOpen>
    {[['site-pages', 'Страници'], ['blog-posts', 'Блог']].map(([path, label]) =>
      <Link key={path} href={`${root}/${path}`} className="nav__link"
        aria-current={pathname === `${root}/${path}` ? 'page' : undefined}>
        <span className="nav__link-label">{label}</span>
      </Link>,
    )}
  </NavGroup>
}
