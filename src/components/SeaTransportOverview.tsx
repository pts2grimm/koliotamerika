import { Ship, Truck, MapPin, ArrowDown } from 'lucide-react'
import type { LandingSection } from '@/lib/landing-content'

export function SeaTransportOverview({ sections }: { sections: LandingSection[] }) {
 const shortcuts = [
  { match: /цен[аи]|разход/i, label: 'Цени и разбивка' },
  { match: /срок|време/i, label: 'Срокове за доставка' },
  { match: /застрахов/i, label: 'Застраховка и щети' },
 ].map(item => ({ ...item, section: sections.find(section => item.match.test(section.title)) }))
 return <section className="container sea-overview" aria-labelledby="sea-route-title">
  <div className="sea-overview-heading"><span className="eyebrow orange">ПЪТЯТ НА АВТОМОБИЛА</span><h2 id="sea-route-title">Три етапа до България.</h2></div>
  <ol className="sea-route">
   <li><Truck size={26} aria-hidden="true" /><div><span>01 · В САЩ</span><h3>До пристанището</h3><p>Вземане от площадката и превоз по суша.</p></div></li>
   <li><Ship size={26} aria-hidden="true" /><div><span>02 · ПРЕЗ ОКЕАНА</span><h3>С кораб до Европа</h3><p>Подготовка, товарене и морски превоз.</p></div></li>
   <li><MapPin size={26} aria-hidden="true" /><div><span>03 · ДО БЪЛГАРИЯ</span><h3>До мястото за доставка</h3><p>Обработка в пристанището и превоз по суша.</p></div></li>
  </ol>
  <nav className="sea-shortcuts" aria-label="Бърз достъп до транспорта">{shortcuts.filter(item => item.section).map(item => <a key={item.label} href={'#' + item.section!.id}>{item.label}<ArrowDown size={16} aria-hidden="true" /></a>)}</nav>
 </section>
}
