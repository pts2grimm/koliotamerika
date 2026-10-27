import type { AuctionCar } from '@/lib/auction-providers/types'
import { auctionImages } from '@/lib/auctions'
import { mileage } from '@/lib/vehicle-details'
import { siteURL } from '@/lib/data'
import { SiteLink as Link } from './SiteLink'

export function VehicleSEO({ car }: { car: AuctionCar }) {
 const auction = car.site === 1 ? 'Copart' : 'IAAI'
 const url = `${siteURL()}/targove/kola?lot=${car.lot_id}&site=${car.site}`
 const questions = [
  { question: `Как мога да купя ${car.title} от ${auction}?`, answer: 'Изпрати запитване с номера на лота. Екипът ще съдейства с проверките, определянето на бюджет, участието в търга и организацията на транспорта.' },
  { question: 'Как се изчислява крайната цена до България?', answer: 'Към цената на автомобила се добавят аукционни такси, вътрешен и морски транспорт, мито, ДДС и разходи по обработката. Ремонтите, хомологацията и регистрацията се уточняват отделно. Калкулаторът дава ориентир, а конкретната оферта се изготвя според лота.' },
  { question: 'Може ли да се провери историята по VIN?', answer: 'Да, можеш да поискаш проверка на наличната история по VIN преди покупка. Обхватът на информацията зависи от автомобила и източниците на данни.' },
  { question: 'Колко време отнема доставката?', answer: 'Срокът зависи от местоположението на автомобила, готовността на документите, транспорта и графика на корабите. Екипът ще уточни очаквания срок за конкретния лот.' },
 ]
 const schema = { '@context': 'https://schema.org', '@graph': [
  // Auction listings are informational pages, not verified retail offers.
  { '@type': 'WebPage', '@id': `${url}#page`, name: car.title, url, inLanguage: 'bg-BG', image: auctionImages(car), description: `${car.title} от ${auction}, лот ${car.lot_id}. Разгледай наличните данни и изпрати запитване за внос до България.` },
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Начало', item: siteURL() }, { '@type': 'ListItem', position: 2, name: 'Търгове', item: `${siteURL()}/targove` }, { '@type': 'ListItem', position: 3, name: car.title, item: url }] },
  { '@type': 'FAQPage', mainEntity: questions.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
 ] }
 return <section className="vehicle-seo" aria-labelledby="vehicle-seo-heading">
  <span className="eyebrow orange">ПОКУПКА И ДОСТАВКА</span><h2 id="vehicle-seo-heading">{car.title} от {auction}</h2>
  <p>Този <strong>{car.title}</strong> е представен в {auction} с номер на лот <strong>{car.lot_id}</strong>. На страницата можеш да разгледаш снимките, VIN номера, техническите характеристики и наличната информация за състоянието на автомобила.</p>
  {(car.location || car.odometer != null || car.engine || car.damage_pr) && <p>{car.location && <>Местоположение: <strong>{car.location}</strong>. </>}{car.odometer != null && <>Обявен пробег: <strong>{mileage(car.odometer, car.odometer_unit)}</strong>. </>}{car.engine && <>Двигател: <strong>{car.engine}</strong>. </>}{car.damage_pr && <>Основна щета: <strong>{car.damage_pr}</strong>.</>}</p>}
  <div className="vehicle-seo-columns"><div><h3>Как да закупиш този автомобил</h3><p>Изпрати <Link href={`/kontakti?car=${encodeURIComponent(`${car.title} · ${auction} лот ${car.lot_id}`)}`}>запитване за лота</Link>, за да получиш съдействие при проверката, определянето на максимална оферта, участието в търга и организацията на транспорта. Нашият екип може да проследи целия процес от американския аукцион до доставката в България.</p><Link className="text-link" href="/vnos-na-koli-ot-usa">Повече за вноса от Америка →</Link></div><div><h3>Крайна цена и доставка до България</h3><p>Към цената на търга се добавят аукционни такси, вътрешен транспорт, морски транспорт, мито, ДДС и разходи по обработката. Използвай <Link href="/kalkulator">калкулатора за цена до България</Link>, а за точна оферта се свържи с нас.</p></div></div>
  <div className="auction-faq"><h3>Често задавани въпроси</h3>{questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
 </section>
}
