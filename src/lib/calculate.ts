import { commissionEur, purchaseFee, roundMoney } from './customer-tariff'
export type CalculatorConfig = {
 usdToEur: number; portHandlingEur: number; deliveryEur: number; insuranceUsd: number; documentUsd: number;
 defaultInland: number; shippingUsd: number; note?: string | null
}
export function calculateImport(price: number, inland: number, shipping: number, config: CalculatorConfig, customsValueEur?: number) {
 const amounts = [inland,shipping,config.portHandlingEur,config.deliveryEur,config.insuranceUsd]
 if (!Number.isFinite(price) || price <= 0 || price > 500000 ||
     !amounts.every(n => Number.isFinite(n) && n >= 0 && n <= 100000) ||
     !Number.isFinite(config.usdToEur) || config.usdToEur <= 0 || config.usdToEur > 10 ||
     (customsValueEur !== undefined && (!Number.isFinite(customsValueEur) || customsValueEur < 0 || customsValueEur > 10000000))) return null
 const fee = purchaseFee(price)!
 const rows = [
  ['Автомобил',price], ['Такси на аукциона',fee], ['Вътрешен транспорт в САЩ',inland],
  ['Морски транспорт',shipping], ['Застраховка — примерен бюджет',config.insuranceUsd],
 ].map(([label,usd])=>({label:String(label),usd:Number(usd),eur:roundMoney(Number(usd)*config.usdToEur)}))
 const subtotalUsd=roundMoney(rows.reduce((sum,row)=>sum+row.usd,0))
 const subtotalEur=roundMoney(subtotalUsd*config.usdToEur)
 const customsEur=roundMoney(customsValueEur ?? subtotalEur)
 const dutyEur=roundMoney(customsEur*0.1)
 const vatBaseEur=roundMoney(customsEur+dutyEur+config.portHandlingEur+config.deliveryEur)
 const vatEur=roundMoney(vatBaseEur*0.2)
 // A customs valuation changes taxes, never the actual purchase/transport costs.
 return {fee,rows,subtotalUsd,subtotalEur,customsEur,dutyEur,vatBaseEur,vatEur,commissionEur,
  totalEur:roundMoney(subtotalEur+config.portHandlingEur+config.deliveryEur+dutyEur+vatEur+commissionEur)}
}
