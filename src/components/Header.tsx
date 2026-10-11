'use client'
import { SiteLink as Link } from '@/components/SiteLink'
import { ThemeToggle } from './ThemeToggle'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { CircleUserRound, ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
const links = [['/targove', 'Търгове'], ['/vnos-na-koli-ot-usa', 'Внос на коли'], ['/uslugi', 'Услуги'], ['/kalkulator', 'Калкулатор'], ['/blog', 'Блог'], ['/kontakti', 'Контакти']]
const services = [
 ['/uslugi','Всички услуги'],
 ['/vnos-na-koli-ot-usa','Внос на автомобили'],
 ['/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena','Цени и такси за внос'],
 ['/proverka-na-istoriya-na-avtomobil','Проверка по VIN'],
 ['/homologacia','Хомологация'],
 ['/vnos-na-motori-ot-sasht','Внос на мотори и ATV'],
 ['/morski-transport-na-avtomobili-ot-sasht','Морски транспорт'],
]
export function Brand() { return <Link href="/" className="brand" aria-label="Коли от Америка — начална страница"><Image src="/images/logo.webp" alt="Коли от Америка" width={180} height={41} priority /></Link> }
export function Header() {
 const [open,setOpen]=useState(false)
 const [servicesOpen,setServicesOpen]=useState(false)
 const pathname=usePathname()
 const nav=useRef<HTMLElement>(null)
 const trigger=useRef<HTMLButtonElement>(null)
 const menu=useRef<HTMLButtonElement>(null)
 const close=()=>{setOpen(false);setServicesOpen(false)}
 useEffect(()=>{
  const pointer=(event:PointerEvent)=>{if(!nav.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)){setServicesOpen(false);setOpen(false)}}
  document.addEventListener('pointerdown',pointer)
  return ()=>document.removeEventListener('pointerdown',pointer)
 },[])
 return <header className="site-header"><div className="container nav-wrap"><Brand />
  <nav ref={nav} id="primary-navigation" aria-label="Основна навигация" className={open?'nav-links open':'nav-links'}
   onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();if(servicesOpen){setServicesOpen(false);trigger.current?.focus()}else{setOpen(false);menu.current?.focus()}}}}>
   {links.map(([href,label])=>href==='/uslugi'?<div className="nav-services" key={href}
    onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setServicesOpen(false)}}>
    <button ref={trigger} type="button" className="services-trigger" aria-expanded={servicesOpen} aria-controls="services-navigation"
     onClick={()=>setServicesOpen(!servicesOpen)}>{label}<ChevronDown size={15} aria-hidden="true" /></button>
    <div id="services-navigation" className="services-dropdown" hidden={!servicesOpen}>
     <span className="services-caption">От избора до България</span>
     {services.map(([url,text])=><Link key={url} href={url} aria-current={pathname===url?'page':undefined} onClick={close}>{text}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}
    </div>
   </div>:<Link key={href} href={href} aria-current={pathname===href?'page':undefined} onClick={close}>{label}</Link>)}
  </nav><ThemeToggle /><Link className="account-nav" href="/profil" aria-label="Моят профил" onClick={close}><CircleUserRound size={23} strokeWidth={1.6} /><span>Моят гараж</span></Link><Link className="button button-dark nav-cta" href="/kontakti">Намери моята кола <ArrowUpRight size={17} /></Link>
  <button ref={menu} className="menu-button" onClick={()=>{setOpen(!open);setServicesOpen(false)}} aria-label={open?'Затвори менюто':'Отвори менюто'} aria-expanded={open} aria-controls="primary-navigation">{open?<X />:<Menu />}</button>
 </div></header>
}
