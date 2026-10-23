import { carCardSelect } from '@/lib/list-projections'
import { HomeSEO, HomeTrust, HomeFAQ, HomeGuide } from '@/components/HomeSEO'
import Image from 'next/image'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight, Search, ShieldCheck, Ship, Check } from 'lucide-react'
import { cms, mediaUrl, imageAlt, settings } from '@/lib/data'
import { CTA } from '@/components/CTA'
import { CarCard } from '@/components/CarCard'
import { AuctionPreview } from '@/components/AuctionPreview'
import { HomeSearch } from '@/components/HomeSearch'
import { auctionMakes } from '@/lib/auctions'
import { commissionEur } from '@/lib/customer-tariff'
import './home-clarity.css'
export const metadata = { title: { absolute: 'Коли от Америка — внос на автомобили от САЩ и Канада' }, description: 'Внос на коли от Америка с Коли от Америка. Избор и проверка на автомобил, търгове Copart и IAAI, транспорт, хомологация и доставка до България.', alternates: { canonical: '/' } }
const priceURL='/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena'
export default async function Home() {
 const [site,makes]=await Promise.all([settings(),auctionMakes().catch(()=>({}))])
 const defaultTitles=['Следващата ти кола.\nОт другата страна на океана.','Следващата ти кола.\nПо твоите правила.']
 const heroTitle=!site.heroTitle||defaultTitles.includes(site.heroTitle)?'Коли от Америка и Канада.\nОт избора до България.':site.heroTitle
 const cars=await(await cms()).find({collection:'cars',overrideAccess:false,select:carCardSelect,depth:1,limit:3,sort:'-createdAt'})
 return <div className="home-clarity">
 <section className="hero hero-showcase">
 <Image className="hero-photo" src={mediaUrl(site.heroImage)||'/images/hero.png'} alt={mediaUrl(site.heroImage)?imageAlt(site.heroImage,'Автомобил от Коли от Америка'):'Илюстративен автомобил на пристанище при изгрев'} fill priority sizes="100vw"/>
 <div className="hero-shade"/><div className="container hero-content"><div className="hero-copy"><span className="eyebrow hero-eyebrow"><span className="tiny-line"/>ПО ТВОИТЕ ПРАВИЛА.</span><h1>{heroTitle.split('\n').map((line,i)=><span key={i}>{line}</span>)}</h1><p>{site.heroDescription}</p><div className="home-hero-actions"><Link href="/kontakti" className="button button-white">Поискай оферта <ArrowUpRight size={18}/></Link><Link href="/kak-rabotim" className="hero-secondary">Как работим <ArrowUpRight size={18}/></Link></div></div><HomeSearch makes={makes}/></div>
 {!mediaUrl(site.heroImage)&&<span className="photo-note">Илюстративно изображение</span>}
 </section>
 <div className="market-strip"><div className="container"><span><Search size={19}/>Избор от Copart и IAAI</span><span><ShieldCheck size={19}/>Проверки преди покупка</span><span><Ship size={19}/>Организация на доставката</span></div></div>
 <section className="catalogue-section"><div className="container"><div className="section-heading"><div><span className="eyebrow orange">НАМЕРИ СВОЯ АВТОМОБИЛ</span><h2>{cars.docs.length?'Автомобили от нашия каталог':'Разгледай автомобилите на търг'}</h2></div><Link className="text-link" href={cars.docs.length?'/avtomobili':'/targove'}>Виж всички <ArrowUpRight size={18}/></Link></div><p>{cars.docs.length?'Провери статуса, цената и условията в обявата на конкретния автомобил.':'Избери марка и модел. В обявите ще намериш VIN, снимки, пробег, описани щети и дата на търга.'}</p>
 {cars.docs.length?<div className="car-grid">{cars.docs.map(car=><CarCard car={car} key={car.id}/>)}</div>:<AuctionPreview/>}
 </div></section>
 <section className="container home-price" id="home-price"><div><span className="eyebrow orange">ЗНАЙ ЗА КАКВО ПЛАЩАШ</span><h2>Цената на търга<br/>е само началото.</h2><p>Преди наддаване уточняваме общия бюджет. Разделяме цената на колата, покупката и обработката, транспорта, данъците и нашата услуга.</p><ul className="home-cost-list"><li>Вътрешен транспорт в САЩ: <strong>$400–$900</strong></li><li>Морски транспорт и доставка: според маршрута</li><li>Мито, ДДС, ремонт и регистрация: отделни разходи</li></ul><div className="home-inline-links"><Link href={priceURL} className="text-link">Пълна разбивка и пример <ArrowUpRight size={18}/></Link><Link href="/kalkulator" className="text-link">Изчисли бюджет <ArrowUpRight size={18}/></Link></div></div>
 <div className="home-commission"><span className="eyebrow">ЦЯЛОСТНО ОБСЛУЖВАНЕ</span><strong>€{commissionEur}</strong><h3>Нашата комисионна</h3><p>Избор и проверка, участие в покупката и организация на вноса в обхвата на офертата.</p><ul><li><Check size={18}/>Съгласуваме лимита преди наддаване.</li><li><Check size={18}/>Описваме включените услуги писмено.</li><li><Check size={18}/>Можеш да купиш чрез нас и без собствен акаунт в Copart или фирма.</li></ul><p className="home-price-note">Депозитът е тази комисионна и е невъзвръщаем. Включва се веднъж. Цената на колата, покупката и обработката, транспортът и данъците са отделно.</p><Link href="/kontakti" className="button button-dark">Обсъди своя автомобил <ArrowUpRight size={18}/></Link></div>
 </section>
 <HomeTrust googleMapsURL={site.googleMapsURL}/>
 <section className="container home-process"><div className="section-heading"><div><span className="eyebrow orange">ЧЕТИРИ ЯСНИ СТЪПКИ</span><h2>Как стига колата до теб?</h2></div><Link href="/kak-rabotim" className="text-link">Целият процес <ArrowUpRight size={18}/></Link></div><ol>{[
 ['Избираме по твоя бюджет','Казваш ни модел, оборудване и общата сума, която можеш да отделиш.'],
 ['Проверяваме и наддаваме','Обсъждаме историята, документите, щетите и лимита за покупка.'],
 ['Организираме превоза','Площадка, пристанище, кораб и доставка — по договорения маршрут.'],
 ['Уточняваме следващите стъпки','Ремонтът, хомологацията и регистрацията се планират отделно.']
 ].map(([title,text],i)=><li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><p className="home-route-note"><strong>Колко се чака?</strong> Срокът зависи от маршрута и документите. При Калифорния, Сиатъл и други локации на Западното крайбрежие често е 3–4 месеца. Потвърждаваме ориентир за конкретната поръчка.</p><HomeGuide/></section>
 <section className="container home-services-compact"><div className="section-heading"><div><span className="eyebrow orange">ПОМОЩ ЗА КОНКРЕТНАТА СТЪПКА</span><h2>От каква услуга имаш нужда?</h2></div><Link href="/uslugi" className="text-link">Всички услуги <ArrowUpRight size={18}/></Link></div><div className="home-service-cards">{[
 ['/vnos-na-koli-ot-usa','Внос на автомобили','Избор, покупка и организация на доставката от САЩ и Канада.'],
 ['/proverka-na-istoriya-na-avtomobil','Проверка по VIN','История, пробег и известни щети преди решение за покупка.'],
 ['/morski-transport-na-avtomobili-ot-sasht','Морски транспорт','Маршрут, товарене и доставка на избрания автомобил.'],
 ['/homologacia','Хомологация','Технически промени и одобряване преди регистрация.'],
 ['/vnos-na-motori-ot-sasht','Мотори и ATV','Покупка, превоз и документи според категорията.'],
 ['/zastrahovka-na-avtomobili-ot-sasht','Транспортна застраховка','Покритие, изключения и действия при щета.']
 ].map(([href,title,text])=><Link key={href} href={href}><h3>{title}<ArrowUpRight size={20}/></h3><p>{text}</p></Link>)}</div></section>
 <section className="container home-dealers" id="dealers"><div><span className="eyebrow orange">ЗА АВТОКЪЩИ И ТЪРГОВЦИ</span><h2>Ти избираш автомобилите.<br/>Ние участваме от твое име.</h2><p>Използвай платформата, изпращай избраните обяви и съгласувай с нас лимита за наддаване. Обсъждаме условия и отстъпки според броя закупени автомобили.</p><Link href="/kontakti" className="button button-dark">Изпрати бизнес запитване <ArrowUpRight size={18}/></Link></div><div><h3>Без фирма или акаунт за търга?</h3><p>Можем да поемем покупката и организацията на вноса с цялостно обслужване. Комисионната е €{commissionEur}; останалите разходи се описват в офертата.</p><p>Партньорската тарифа за търговци се договаря отделно според обхвата и покупките.</p><Link href={priceURL} className="text-link">Виж условията и разходите <ArrowUpRight size={18}/></Link></div></section>
 <HomeFAQ faq={site.faq}/>
 <HomeSEO viberURL={site.viberURL}/>
 <section className="container home-company"><p>Зад „Коли от Америка“ стои <strong>Pontus LLC, с търговско име HWY 17 Auto Sales</strong>. <Link href="/amerikanski-sajt-za-koli">Повече за нас</Link> · <Link href="/obshti-usloviya">Общи условия</Link></p><p>Платформи и услуги при вноса: Copart · IAAI · CARFAX · AutoCheck · Atlantic Export.</p></section>
 <CTA/>
 </div>
}
