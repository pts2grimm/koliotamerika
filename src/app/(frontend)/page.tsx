import { HomeSEO, HomeIntroduction, HomeCatalogueCopy, additionalHomeFAQ } from '@/components/HomeSEO'
import Image from 'next/image'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight, Check, Search, ShieldCheck, Ship } from 'lucide-react'
import { cms, mediaUrl, imageAlt, settings } from '@/lib/data'
import { CTA } from '@/components/CTA'
import { CarCard } from '@/components/CarCard'
import { AuctionPreview } from '@/components/AuctionPreview'
import { HomeSearch } from '@/components/HomeSearch'
import { auctionMakes } from '@/lib/auctions'
export const metadata = { title: { absolute: 'Коли от Америка — внос на автомобили от САЩ и Канада' }, description: 'Внос на коли от Америка с Коли от Америка. Избор и проверка на автомобил, търгове Copart и IAAI, транспорт, хомологация и доставка до България.', alternates: { canonical: '/' } }
export default async function Home() {
 const [site, makes] = await Promise.all([settings(), auctionMakes().catch(() => ({}))])
 const homeQuestions = additionalHomeFAQ(site.faq)
 const heroTitle = !site.heroTitle || site.heroTitle === 'Следващата ти кола.\nОт другата страна на океана.' ? 'Следващата ти кола.\nПо твоите правила.' : site.heroTitle
 const cars = await (await cms()).find({ collection: 'cars', overrideAccess: false, limit: 3, sort: '-createdAt' })
 return <>
  <section className="hero hero-showcase">
   <Image className="hero-photo" src={mediaUrl(site.heroImage) || '/images/hero.png'} alt={mediaUrl(site.heroImage) ? imageAlt(site.heroImage, 'Автомобил от Коли от Америка') : 'Илюстративен автомобил на пристанище при изгрев'} fill priority sizes="100vw" />
   <div className="hero-shade" />
   <div className="container hero-content">
    <div className="hero-copy"><span className="eyebrow hero-eyebrow"><span className="tiny-line" />ОТ АМЕРИКА. ДО ТВОЯ ГАРАЖ.</span><h1>{heroTitle.split('\n').map((line, i) => <span key={i}>{line}</span>)}</h1><p>{site.heroDescription}</p><Link href="/kak-rabotim" className="hero-secondary">Виж пътя до България <ArrowUpRight size={19} /></Link></div>
    <HomeSearch makes={makes} />
   </div>
   {!mediaUrl(site.heroImage) && <span className="photo-note">Илюстративно изображение</span>}
  </section>
  <div className="market-strip"><div className="container"><span><Search size={19} />Избор от Copart и IAAI</span><span><ShieldCheck size={19} />Проверки преди покупка</span><span><Ship size={19} />Съдействие до България</span></div></div>
  <section className="catalogue-section"><div className="container"><div className="section-heading"><div><span className="eyebrow orange">СЛЕДВАЩАТА ТИ КОЛА</span><h2>Открий своя следващ автомобил.</h2></div><Link href="/targove" className="text-link">Всички търгове <ArrowUpRight size={19} /></Link></div><HomeCatalogueCopy />{cars.docs.length ? <div className="car-grid">{cars.docs.map(car => <CarCard car={car} key={car.id} />)}</div> : <AuctionPreview />}</div></section>
  <section className="container intro-section"><div className="section-heading"><div><span className="eyebrow orange">ПОВЕЧЕ ВЪЗМОЖНОСТИ. ТВОЯТ ИЗБОР.</span><h2>Друг пазар.<br /><span className="muted">Нови възможности.</span></h2></div><p>Търсиш точния модел, повече оборудване или нещо различно? Погледни отвъд познатото. Ние сме тук, за да обсъдим пътя до твоя следващ автомобил.</p></div><div className="benefit-grid">{[
   { Icon: Search, title: 'Изборът започва от теб', text: 'Марка, модел, характер. Кажи ни какво е важно за теб и с какъв бюджет разполагаш.', num: '01' },
   { Icon: ShieldCheck, title: 'Информация преди решение', text: 'История, състояние и очаквани разходи — въпросите, които задаваме преди следващата стъпка.', num: '02' },
   { Icon: Ship, title: 'План за целия път', text: 'От покупката до транспорта. Уточняваме етапите и условията за конкретния автомобил.', num: '03' }
  ].map(({ Icon, title, text, num }) => <article className="benefit-card" key={num}><div className="benefit-top"><Icon size={28} strokeWidth={1.5} /><span>{num}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  <section className="container process-section"><div className="process-intro"><span className="eyebrow orange">ОТ ИДЕЯТА ДО КЛЮЧОВЕТЕ</span><h2>Голямо разстояние.<br />Ясни стъпки.</h2><p>Вносът започва с разговор и добър план. Виж какво предстои по пътя.</p><Link className="text-link" href="/kak-rabotim">Разгледай целия процес <ArrowUpRight size={19} /></Link><div className="route-graphic"><span>USA / CAN</span><span className="route-dots" /><Ship size={24} /><span className="route-dots" /><span>BG</span></div></div><div className="steps">{[
    ['Сподели какво търсиш', 'Модел, оборудване и бюджет. Започваме с твоите изисквания.'], ['Разгледай възможностите', 'Обсъждаме предложенията, наличната информация и разходите.'], ['Уточни покупката и транспорта', 'Съгласуваме условията и организацията на следващите стъпки.'], ['Подготви се за пристигането', 'Документи, необходими процедури и предаване в България.']
  ].map(([title, text], i) => <div className="step" key={title}><span className="step-num">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div><Check className="step-check" size={19} /></div>)}</div></section>
  {!!homeQuestions?.length && <section className="faq-section container"><div className="section-heading"><div><span className="eyebrow orange">ДОБРЕ Е ДА ЗНАЕШ</span><h2>Въпросите са част от пътя.</h2></div><Link className="text-link" href="/kontakti">Попитай ни <ArrowUpRight size={19} /></Link></div><div className="faq-list">{homeQuestions.map((item, i) => <details key={item.id || i}><summary><span className="faq-num">0{i + 1}</span>{item.question}<span className="faq-plus">+</span></summary><p>{item.answer}</p></details>)}</div></section>}
  <section className="container service-directory"><span className="eyebrow orange">ВСИЧКО ЗА ВНОСА</span><h2>От първия избор до България.</h2><div className="services-links">{[["/vnos-na-koli-ot-usa","Внос на коли от САЩ и Канада"],["/vnos-na-motori-ot-sasht","Мотори, UTV и ATV"],["/homologacia","Хомологация"],["/proverka-na-istoriya-na-avtomobil","Проверка на история"],["/kalkulator","Калкулатор за внос"],["/chesto-zadavani-vuprosi","Често задавани въпроси"]].map(([href,label]) => <Link key={href} href={href}>{label}<ArrowUpRight size={18}/></Link>)}</div></section>
  <HomeIntroduction />
  <HomeSEO viberURL={site.viberURL} faq={site.faq} />
  <CTA />
 </>
}
