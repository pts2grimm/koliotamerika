import { isPreview } from '@/lib/preview'
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'
import { InquiryForm } from '@/components/InquiryForm'
import { settings } from '@/lib/data'
export const metadata = { title: 'Контакти и запитване', description: 'Изпратете запитване за внос на автомобил от САЩ или Канада. Посочете предпочитан модел и бюджет.', alternates: { canonical: '/kontakti' } }
export default async function Contact({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
 const site = await settings(); const params = await searchParams
 const car = typeof params.car === 'string' ? params.car.slice(0, 160) : ''
 return <section className="container contact-section"><div className="contact-intro"><span className="eyebrow orange">ДА ПОГОВОРИМ</span><h1>Всяко пътуване<br />започва с<br /><span className="muted">„Здравей“.</span></h1><p>Кажи ни какъв автомобил търсиш.<br />Нека обсъдим възможностите.</p><div className="contact-methods">{site.phone && <a href={`tel:${site.phone.replace(/[^+\d]/g, '')}`}><Phone size={20} /><span><small>ОБАДИ НИ СЕ</small>{site.phone}</span><ArrowUpRight size={18} /></a>}{site.email && <a href={`mailto:${site.email}`}><Mail size={20} /><span><small>ПИШИ НИ</small>{site.email}</span><ArrowUpRight size={18} /></a>}{site.address && <div><MapPin size={20} /><span><small>НАМЕРИ НИ</small>{site.address}</span></div>}</div><div className="social-links">{site.viberURL && <a href={site.viberURL} target="_blank" rel="noreferrer">Viber група</a>}{site.facebookURL && <a href={site.facebookURL} target="_blank" rel="noreferrer">Facebook</a>}</div>{site.workingHours && <p>{site.workingHours}</p>}<div className="contact-signature"><span>USA / CAN</span><span><ArrowUpRight size={36} /></span><span>BULGARIA</span></div></div><div className="form-card"><h2>Твоята следваща кола започва тук.</h2><p>Остави ни малко информация за това, което търсиш.</p><InquiryForm car={car} preview={isPreview()} /></div></section>
}
