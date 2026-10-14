'use client'
import { useState } from 'react'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight, Calculator } from 'lucide-react'
import { calculateImport, type CalculatorConfig } from '@/lib/calculate'
import { formatCurrency } from '@/lib/currency'
import { exampleCosts } from '@/lib/customer-tariff'
export function ImportCalculator({config}:{config:CalculatorConfig}) {
 const [price,setPrice]=useState('10000'),[inland,setInland]=useState(String(config.defaultInland)),[shipping,setShipping]=useState(String(config.shippingUsd))
 const [costs,setCosts]=useState(config)
 const [customsValue,setCustomsValue]=useState<string|null>(null)
 const automatic=price.trim()&&inland.trim()&&shipping.trim()?calculateImport(Number(price),Number(inland),Number(shipping),costs):null
 const total=automatic?calculateImport(Number(price),Number(inland),Number(shipping),costs,customsValue===null?undefined:customsValue.trim()?Number(customsValue):NaN):null
 const format=formatCurrency
 function example(){setPrice('10000');setInland('500');setShipping('1000');setCosts({...config,...exampleCosts});setCustomsValue(null)}
 return <section id="calc" className="container calculator-section"><div className="section-heading"><div><span className="eyebrow orange">ПЛАНИРАЙ СЛЕДВАЩАТА СТЪПКА</span><h2>Колко ще струва вносът?</h2></div><Calculator size={30} strokeWidth={1.4}/></div>
 <p>Сметка за стандартен лек автомобил от Copart с ориентировъчни такси на аукциона. За IAA, Канада, мотори и други категории поискай отделна оферта.</p>
 <div className="calculator-grid"><div className="calculator-inputs">
 {([['Цена на автомобила на търг (USD)',price,setPrice,500000],['Вътрешен транспорт (USD)',inland,setInland,100000],['Морски транспорт / контейнер (USD)',shipping,setShipping,100000]] as const).map(([label,value,set,max],i)=><label key={label}>{label}<input type="number" min={i===0?1:0} max={max} step="0.01" value={value} onChange={e=>set(e.target.value)}/></label>)}
 <div className="calculator-customs">
 <label>Митническа стойност (EUR)<input type="number" min="0" max="10000000" step="0.01" aria-describedby="customs-help" value={customsValue ?? (automatic?String(automatic.subtotalEur):'')} onChange={e=>setCustomsValue(e.target.value)}/></label>
 <p id="customs-help">{customsValue===null?'Изчислява се автоматично от автомобила, таксите на аукциона, транспорта и застраховката до ЕС. Можеш да въведеш друга стойност.':'Използва се въведената от теб стойност. Промените в цената и транспорта няма да я заменят.'}</p>
 {customsValue!==null&&<button className="button button-outline" type="button" onClick={()=>setCustomsValue(null)}>Използвай изчислената стойност</button>}
 </div>
 <details className="calculator-assumptions"><summary>Курс и останали примерни разходи</summary>
 {([['usdToEur','Курс: 1 USD в EUR'],['insuranceUsd','Застраховка (USD)'],['portHandlingEur','Обработка в пристанището (EUR)'],['deliveryEur','Доставка до България (EUR)']] as const).map(([key,label])=><label key={key}>{label}<input type="number" step="0.01" min={key==='usdToEur'?0.01:0} max={key==='usdToEur'?10:100000} value={Number.isFinite(costs[key])?costs[key]:''} onChange={e=>setCosts({...costs,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}
 </details>
 <button className="button button-outline" type="button" onClick={example}>Зареди примера за $10 000</button>
 <p>Транспортът, застраховката и курсът са примерни, а не текуща оферта. Вътрешният транспорт обичайно е $400–$900 според конкретния автомобил.</p>
 <p>В тази сметка приемаме мито 10% и ДДС 20% при внос в България. Митото се изчислява върху полето „Митническа стойност“. В основата за ДДС добавяме митото, обработката и доставката до България. Ръчната промяна на митническата стойност не променя разходите за покупка и транспорт. Реалното третиране се потвърждава по документите.</p>
 {config.note&&<p>{config.note}</p>}
 <Link className="text-link" href="/vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena">Виж подробности за разходите <ArrowUpRight size={18}/></Link>
 </div><div className="calculator-result" aria-live="polite"><span className="eyebrow">ОБЩО ЗА ИЗБРОЕНИТЕ РАЗХОДИ</span>
 {total?<><strong data-testid="calculator-total">{format(total.totalEur)}</strong><p>Преди ремонт, хомологация и регистрация.</p><dl>
 {total.rows.map(row=><div key={row.label}><dt>{row.label}<small>{format(row.usd,'USD')}</small></dt><dd>{format(row.eur)}</dd></div>)}
 <div className="calculator-subtotal"><dt>Междинна сума до ЕС</dt><dd>{format(total.subtotalEur)}</dd></div>
 <div><dt>Митническа стойност</dt><dd>{format(total.customsEur)}</dd></div>
 <div><dt>Мито — 10%</dt><dd>{format(total.dutyEur)}</dd></div>
 <div><dt>Обработка в пристанището</dt><dd>{format(costs.portHandlingEur)}</dd></div>
 <div><dt>Доставка до България</dt><dd>{format(costs.deliveryEur)}</dd></div>
 <div><dt>ДДС — 20% върху {format(total.vatBaseEur)}</dt><dd>{format(total.vatEur)}</dd></div>
 <div><dt>Нашата комисионна / депозит</dt><dd>{format(total.commissionEur)}</dd></div>
 </dl><p>Депозитът е невъзвръщаемата комисионна и е включен веднъж. Не добавяш втори депозит към показаната сума.</p>
 <p>Примерен курс: $1 = €{costs.usdToEur.toFixed(4)}. Банкови такси, престой и други извънредни разходи се уточняват отделно.</p></>:<p role="status">Попълни валидни суми и курс, за да видиш сметката. Транспортът може да е 0, ако е включен в друга потвърдена сума.</p>}
 <Link href="/kontakti" className="button button-orange">Поискай индивидуална оферта <ArrowUpRight size={18}/></Link>
 </div></div></section>
}
