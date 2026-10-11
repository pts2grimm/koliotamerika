import { commissionEur, environmentalUsd, gateUsd, onlineFee, purchaseFee, roundMoney } from './customer-tariff'
export type CalculatorConfig = {
 usdToEur: number; portHandlingEur: number; deliveryEur: number; insuranceUsd: number; documentUsd: number;
 defaultInland: number; shippingUsd: number; note?: string | null
}
export function calculateImport(price: number, inland: number, shipping: number, config: CalculatorConfig) {
 const amounts = [inland,shipping,config.portHandlingEur,config.deliveryEur,config.insuranceUsd,config.documentUsd]
 if (!Number.isFinite(price) || price <= 0 || price > 500000 ||
     !amounts.every(n => Number.isFinite(n) && n >= 0 && n <= 100000) ||
     !Number.isFinite(config.usdToEur) || config.usdToEur <= 0 || config.usdToEur > 10) return null
 const fee = purchaseFee(price)!, online = onlineFee(price)!
 const rows = [
  ['Автомобил',price], ['Покупка и обработка — наша тарифа',fee], ['Получаване от площадката',gateUsd],
  ['Онлайн наддаване — наша тарифа',online], ['Екологична такса',environmentalUsd],
  ['Изпращане на документ — пример',config.documentUsd], ['Вътрешен транспорт в САЩ',inland],
  ['Морски транспорт',shipping], ['Застраховка — примерен бюджет',config.insuranceUsd],
 ].map(([label,usd])=>({label:String(label),usd:Number(usd),eur:roundMoney(Number(usd)*config.usdToEur)}))
 const subtotalUsd=roundMoney(rows.reduce((sum,row)=>sum+row.usd,0))
 const customsEur=roundMoney(subtotalUsd*config.usdToEur)
 const dutyEur=roundMoney(customsEur*0.1)
 const vatBaseEur=roundMoney(customsEur+dutyEur+config.portHandlingEur+config.deliveryEur)
 const vatEur=roundMoney(vatBaseEur*0.2)
 return {fee,online,rows,subtotalUsd,customsEur,dutyEur,vatBaseEur,vatEur,commissionEur,
  totalEur:roundMoney(vatBaseEur+vatEur+commissionEur)}
}
