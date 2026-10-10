import { HomeSEO, HomeIntroduction, HomeCatalogueCopy } from '@/components/HomeSEO'
import Image from 'next/image'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight, Search, ShieldCheck, Ship } from 'lucide-react'
import { cms, mediaUrl, imageAlt, settings } from '@/lib/data'
import { CTA } from '@/components/CTA'
import { CarCard } from '@/components/CarCard'
import { AuctionPreview } from '@/components/AuctionPreview'
import { HomeSearch } from '@/components/HomeSearch'
import { auctionMakes } from '@/lib/auctions'
export const metadata = { title: 'Коли от Америка — внос на автомобили от САЩ и Канада', description: 'Внос на коли от Америка с Коли от Америка. Избор и проверка на автомобил, търгове Copart и IAAI, транспорт, хомологация и доставка до България.', alternates: { canonical: '/' } }
export default async function Home() {
 const [site, makes] = await Promise.all([settings(), auctionMakes().catch(() => ({}))])
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
  <HomeIntroduction />
  <section className="catalogue-section"><div className="container"><div className="section-heading"><div><span className="eyebrow orange">СЛЕДВАЩАТА ТИ КОЛА</span><h2>Открий своя следващ автомобил.</h2></div><Link href="/targove" className="text-link">Всички търгове <ArrowUpRight size={19} /></Link></div><HomeCatalogueCopy />{cars.docs.length ? <div className="car-grid">{cars.docs.map(car => <CarCard car={car} key={car.id} />)}</div> : <AuctionPreview />}</div></section>
  <HomeSEO viberURL={site.viberURL} faq={site.faq} />
  <CTA />
 </>
}
