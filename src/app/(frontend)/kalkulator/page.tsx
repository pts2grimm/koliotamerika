import { ImportCalculator } from '@/components/ImportCalculator'
import { LandingHero } from '@/components/LandingHero'
import { SiteLink as Link } from '@/components/SiteLink'
import { CTA } from '@/components/CTA'
import { calculatorSettings } from '@/lib/calculator'
export const metadata = { title: 'Калкулатор за внос на кола от Америка', description: 'Изчислете ориентировъчната цена за внос на автомобил от Америка според тарифата на Коли от Америка.', alternates: { canonical: '/kalkulator' } }
export default async function Page() {
 return <div className="landing-page landing-calculator">
  <LandingHero eyebrow="Калкулатор за внос" title="Калкулатор за внос на кола от Америка" intro="Погледни отвъд цената на търга. Планирай покупката, транспорта и разходите до България с ориентировъчна сметка за твоя автомобил." image="/images/legacy/wp-2420.webp" imageAlt="Автомобил пред товарни контейнери" tags={['Цена на търга', 'Транспорт', 'Общ бюджет']} primary={{ href: '#calc', label: 'Изчисли своя бюджет' }} secondary={{ href: '/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena', label: 'Как се формира цената' }} caption="Първо добър план. После точният автомобил." />
  <div className="container landing-budget-steps"><div><span>01</span><p><strong>Започни с автомобила.</strong>Въведи планираната цена на търга в USD.</p></div><div><span>02</span><p><strong>Добави транспорта.</strong>Съобрази разходите с местоположението на автомобила.</p></div><div><span>03</span><p><strong>Обсъди крайната оферта.</strong>Сметката е ориентировъчна и се уточнява индивидуално.</p></div></div>
  <ImportCalculator config={await calculatorSettings()} />
  <section className="container article-body"><h2>Как да използваш ориентировъчната сметка</h2><p>Въведи очакваната цена на търга и уточни транспортните разходи според местоположението на автомобила. Калкулаторът използва зададените тарифи и валутен курс; резултатът не е окончателна оферта.</p><p>Преди покупка поискай разбивка на включените такси и услуги. Разходите за ремонт, технически промени, хомологация и регистрация трябва да бъдат уточнени отделно за конкретния автомобил.</p><p>Виж <Link href="/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena">как се формира цената за внос</Link> или <Link href="/kontakti">изпрати обявата за индивидуална оферта</Link>.</p></section>
  <CTA />
 </div>
}
