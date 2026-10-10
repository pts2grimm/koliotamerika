import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
export function CTA() { return <section className="cta-section container"><div className="cta-box"><div><span className="eyebrow">ТВОЯТ СЛЕДВАЩ ХОД</span><h2>Твоята кола е някъде там.<br />Да я намерим заедно.</h2><p>Разкажи ни какво търсиш. Започваме от теб.</p></div><Link href="/kontakti" className="button button-white">Изпрати запитване <ArrowUpRight size={20} /></Link><span className="cta-decoration" aria-hidden="true"><ArrowUpRight size={350} strokeWidth={0.6} /></span></div></section> }
