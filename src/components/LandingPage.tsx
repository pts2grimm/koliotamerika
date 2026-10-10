import { ArrowUpRight, ChevronDown, CarFront, Bike, ScanSearch, FileCheck2 } from 'lucide-react'
import type { Page } from '@/payload-types'
import { imageAlt, mediaUrl } from '@/lib/data'
import { landingSections } from '@/lib/landing-content'
import { SiteLink as Link } from './SiteLink'
import { EditorialContent } from './EditorialContent'
import { LandingHero } from './LandingHero'
import { CTA } from './CTA'
import type { ReactNode } from 'react'

const profiles: Record<string, { eyebrow: string; image?: string; tags: string[] }> = {
 'vnos-na-koli-ot-usa': { eyebrow: 'Внос от САЩ и Канада', tags: ['Избор на автомобил', 'Участие в търг', 'Транспорт до България'] },
 'uslugi': { eyebrow: 'Нашите услуги', image: '/images/legacy/wp-32.webp', tags: ['Консултация', 'Проверка', 'Организация на вноса'] },
 'kak-rabotim': { eyebrow: 'Как работим', image: '/images/legacy/wp-2420.webp', tags: ['Твоите изисквания', 'Ясен план', 'Следващи стъпки'] },
 'homologacia': { eyebrow: 'Хомологация', tags: ['Документи', 'Технически изисквания', 'Регистрация'] },
 'vnos-na-motori-ot-sasht': { eyebrow: 'Мотори и ATV', image: '/images/legacy/wp-4475.webp', tags: ['Мотоциклети', 'ATV', 'Внос от САЩ'] },
 'vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena': { eyebrow: 'Цени и разходи', tags: ['Покупна цена', 'Такси и транспорт', 'Индивидуална оферта'] },
 'amerikanski-sajt-za-koli': { eyebrow: 'За нас', image: '/images/legacy/wp-32.webp', tags: ['САЩ', 'Канада', 'България'] },
 'za-nas': { eyebrow: 'За нас', image: '/images/legacy/wp-32.webp', tags: ['САЩ', 'Канада', 'България'] },
 'chesto-zadavani-vuprosi': { eyebrow: 'Въпроси и отговори', tags: ['Преди покупката', 'По време на вноса', 'След доставката'] },
 'aukcioni-za-koli-v-amerika': { eyebrow: 'Наръчник за търговете', image: '/images/legacy/wp-2420.webp', tags: ['Документи', 'Състояние', 'Термини'] },
 'proverka-na-istoriya-na-avtomobil': { eyebrow: 'Проверка на автомобил', tags: ['VIN и история', 'Състояние', 'Информиран избор'] },
}
const services = [
 { href: '/vnos-na-koli-ot-usa', title: 'Внос на автомобили', description: 'От избора на автомобил и търга до транспорта към България.', icon: CarFront },
 { href: '/proverka-na-istoriya-na-avtomobil', title: 'История и проверка', description: 'Повече информация за автомобила, преди да вземеш решение.', icon: ScanSearch },
 { href: '/homologacia', title: 'Хомологация', description: 'Подготовка за европейските изисквания и регистрацията.', icon: FileCheck2 },
 { href: '/vnos-na-motori-ot-sasht', title: 'Мотори и ATV', description: 'Възможности за покупка и внос на две и четири колела.', icon: Bike },
]
export function LandingPage({ page, children }: { page: Page; children?: ReactNode }) {
 const profile = profiles[page.slug]
 const sections = landingSections(page)
 const image = mediaUrl(page.image) || profile?.image || page.legacyImage || '/images/legacy/wp-32.webp'
 const isServices = page.slug === 'uslugi'
 return <div className="landing-page">
  <LandingHero title={page.title} intro={page.intro} eyebrow={page.eyebrow || profile?.eyebrow || 'Коли от Америка'} image={image} imageAlt={imageAlt(page.image, page.title)} tags={profile?.tags} />
  {isServices && <section className="container landing-services" aria-labelledby="services-title"><div className="landing-section-heading"><span className="eyebrow orange">ОТ КАКВО ИМАШ НУЖДА?</span><h2 id="services-title">Всяка стъпка има значение.</h2></div><div className="landing-service-grid">{services.map(({ href, title, description, icon: Icon }, i) => <Link href={href} className="landing-service-card" key={href}><span className="landing-service-top"><Icon size={30} strokeWidth={1.5} /><span>0{i + 1}</span></span><h3>{title}</h3><p>{description}</p><span className="landing-service-link">Разгледай услугата<ArrowUpRight size={21} /></span></Link>)}</div></section>}
  <div className="container landing-content-grid" id="landing-content">
   <aside className="landing-aside"><div className="landing-aside-inner"><nav aria-label="На тази страница"><span className="eyebrow orange">НА ТАЗИ СТРАНИЦА</span><ol>{sections.map((section, i) => <li key={section.id}><a href={'#' + section.id}><span>{String(i + 1).padStart(2, '0')}</span>{section.title}</a></li>)}</ol></nav><div className="landing-help"><span className="eyebrow">ТВОЯТА СЛЕДВАЩА СТЪПКА</span><h2>Имаш конкретен автомобил предвид?</h2><p>Изпрати модела или обявата. Нека обсъдим възможностите.</p><Link href="/kontakti">Изпрати запитване<ArrowUpRight size={19} /></Link></div></div></aside>
   <div className="landing-chapters">{sections.map((section, i) => {
    const content = <>{section.rich && <EditorialContent data={section.rich} />}{section.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}</>
    return /[?？]\s*$/.test(section.title) ? <details className="landing-question" id={section.id} key={section.id}><summary><span>{section.title}</span><ChevronDown size={22} /></summary><div className="landing-rich">{content}</div></details> : <section className="landing-chapter" id={section.id} key={section.id}><span className="landing-chapter-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h2>{section.title}</h2><div className="landing-rich">{content}</div></section>
   })}</div>
  </div>
  {children}
  <section className="container landing-next"><div><span className="eyebrow orange">ПЛАНИРАЙ СЛЕДВАЩИЯ ХОД</span><h2>От информацията<br />към твоя автомобил.</h2></div><div className="landing-next-links"><Link href="/targove"><span>Разгледай автомобилите на търг</span><ArrowUpRight /></Link><Link href="/kalkulator"><span>Планирай бюджета за внос</span><ArrowUpRight /></Link><Link href="/chesto-zadavani-vuprosi"><span>Намери отговор на въпросите си</span><ArrowUpRight /></Link></div></section>
  <CTA />
 </div>
}
