import { ImportCalculator } from '@/components/ImportCalculator'
import { calculatorSettings } from '@/lib/calculator'
export const metadata={title:'Калкулатор за внос на автомобил',description:'Изчислете ориентировъчната цена за внос на автомобил от Америка според тарифата на Коли от Америка.',alternates:{canonical:'/kalkulator'}}
export default async function Page(){return <><div className="page-heading container"><span className="eyebrow orange">БЮДЖЕТЪТ Е ЧАСТ ОТ ПЛАНА</span><h1>Повече яснота.<br/>Преди покупката.</h1><p>Използвай калкулатора като отправна точка за разговор и индивидуална оферта.</p></div><ImportCalculator config={await calculatorSettings()}/></>}
