'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { UserRound, ArrowUpRight, Menu, X } from 'lucide-react'
const links = [['/targove', 'Търгове'], ['/vnos-na-koli-ot-usa', 'Внос на коли'], ['/uslugi', 'Услуги'], ['/kalkulator', 'Калкулатор'], ['/blog', 'Блог'], ['/kontakti', 'Контакти']]
export function Brand() { return <Link href="/" className="brand" aria-label="Коли от Америка — начална страница"><Image src="/images/logo.webp" alt="Коли от Америка" width={180} height={41} priority /></Link> }
export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  return <header className="site-header"><div className="container nav-wrap"><Brand /><nav aria-label="Основна навигация" className={open ? 'nav-links open' : 'nav-links'}>{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}</nav><Link className="account-nav" href="/profil" aria-label="Моят профил" onClick={() => setOpen(false)}><UserRound size={21} /></Link><Link className="button button-dark nav-cta" href="/kontakti">Намери моята кола <ArrowUpRight size={17} /></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Затвори менюто' : 'Отвори менюто'} aria-expanded={open}>{open ? <X /> : <Menu />}</button></div></header>
}
