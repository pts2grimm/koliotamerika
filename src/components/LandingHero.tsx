import type { ReactNode } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUpRight, ArrowRight } from 'lucide-react'
import { SiteLink as Link } from './SiteLink'

type Props = {
 title: string; intro: string; eyebrow: string; image: string; imageAlt: string
 tags?: string[]; primary?: { href: string; label: string }; secondary?: { href: string; label: string }
 caption?: string; parent?: { href: string; label: string }; metadata?: ReactNode
}
export function LandingHero({ title, intro, eyebrow, image, imageAlt, tags = [], primary = { href: '/kontakti', label: 'Обсъди своята кола' }, secondary = { href: '#landing-content', label: 'Виж подробностите' }, caption = 'От първия избор до следващата стъпка.', parent, metadata }: Props) {
 return <section className="landing-hero">
  <div className="container">
   <nav className="landing-breadcrumbs" aria-label="Път до страницата"><Link href="/">Начало</Link><span aria-hidden="true">/</span>{parent && <><Link href={parent.href}>{parent.label}</Link><span aria-hidden="true">/</span></>}<span aria-current="page">{eyebrow}</span></nav>
   <div className="landing-hero-grid">
    <div className="landing-hero-copy"><span className="eyebrow orange"><span className="landing-dash" aria-hidden="true" />{eyebrow}</span><h1>{title}</h1><p>{intro}</p><div className="landing-actions"><Link className="button button-orange" href={primary.href}>{primary.label}<ArrowUpRight size={19} /></Link><a className="landing-secondary" href={secondary.href}>{secondary.label}{secondary.href.startsWith('#') ? <ArrowDown size={17} /> : <ArrowUpRight size={17} />}</a></div>{tags.length > 0 && <ul className="landing-tags">{tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}{metadata}</div>
    <figure className="landing-hero-image"><Image src={image} alt={imageAlt} fill sizes="(max-width: 900px) 100vw, 48vw" priority /><figcaption><span className="eyebrow">КОЛИ ОТ АМЕРИКА</span><span>{caption}</span><ArrowRight size={28} aria-hidden="true" /></figcaption></figure>
   </div>
  </div>
 </section>
}
