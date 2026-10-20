import { bosToday, validBosDate, validBosMoney } from './bos'
export const invoiceFees = [
 ['delivery','Delivery'], ['shipping','Shipping'], ['dealerFee','Dealer fee'],
 ['storage','Storage'], ['lateFee','Late fee'], ['evFee','EV fee'], ['addServices','Add services'],
] as const
export type InvoiceFee = typeof invoiceFees[number][0]
export const invoiceDefaults = {
 version: 1,
 seller: { name:'LUXURY CARS TRADING LLC', address:'23272 Mill Creek Dr Ste 100WF', city:'Laguna Hills', statePostal:'CA 92653' },
 buyer: { name:'PONTUS LLC', address:'10510 Abercorn St, GA,', cityPostal:'Savannah 31419', country:'United States' },
 bank: { company:'LUXURY CARS TRADING LLC', address:'23272 Mill Creek Dr Ste 100WF Laguna Hills CA 92653', name:'Bank of America, NA', bankAddress:'222 Broadway, New York, NY 10038', swift:'BOFAUS3N', account:'', routingElectronic:'', routingWire:'' },
}
export type InvoiceParties = typeof invoiceDefaults
export function invoiceParties(value: unknown): InvoiceParties {
 if(!value || typeof value!=='object')throw new Error('Липсват запазените данни за страните и плащането.')
 const record=value as Record<string,unknown>
 if(record.version!==1)throw new Error('Непознат формат на данните за плащане.')
 for(const group of ['seller','buyer','bank'] as const){
  const data=record[group]
  if(!data || typeof data!=='object' || Object.keys(invoiceDefaults[group]).some(key=>typeof (data as Record<string,unknown>)[key]!=='string' || !(data as Record<string,string>)[key].trim()))throw new Error('Непълни данни за плащане.')
 }
 return value as InvoiceParties
}
export function invoiceAmounts(rows: unknown, paid: unknown) {
 if(!Array.isArray(rows)||rows.length<1||rows.length>50)throw new Error('Добави от 1 до 50 автомобила.')
 if(!validBosMoney(paid))throw new Error('Невалидна платена сума.')
 const rowTotals=rows.map(row=>{
  if(!row||typeof row!=='object')throw new Error('Невалиден ред за автомобил.')
  let cents=0
  for(const [key,label] of invoiceFees){
   const value=row[key]
   if(!validBosMoney(value))throw new Error(label+': въведи неотрицателна сума с най-много два знака.')
   cents+=Math.round(value*100)
  }
  return cents
 })
 const totalCents=rowTotals.reduce((sum,value)=>sum+value,0), paidCents=Math.round((paid as number)*100)
 if(paidCents>totalCents)throw new Error('Платената сума не може да надвишава общата сума.')
 return {rowTotals:rowTotals.map(value=>value/100),total:totalCents/100,balance:(totalCents-paidCents)/100}
}
export function invoicePastDue(due: string | null | undefined, balance: number, today=bosToday()) {
 if(!due || !validBosDate(due)||balance<=0)return 0
 return Math.max(0,Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(due+'T00:00:00Z'))/86400000))
}

export function invoiceSnapshot(settings: { account?: string|null; routingElectronic?: string|null; routingWire?: string|null }) {
 if(!settings.account || !/^[0-9]{6,20}$/.test(settings.account) || !settings.routingElectronic || !/^[0-9]{9}$/.test(settings.routingElectronic) || !settings.routingWire || !/^[0-9]{9}$/.test(settings.routingWire))throw new Error('Първо попълни сметката и двата routing номера в Документи → Настройки на Invoice.')
 return {...structuredClone(invoiceDefaults),bank:{...invoiceDefaults.bank,account:settings.account,routingElectronic:settings.routingElectronic,routingWire:settings.routingWire}}
}

/** Seven calendar days, without local-time/DST shifts. Stored dates remain date-only. */
export function invoiceDueDate(created=bosToday()) {
 if(!validBosDate(created))throw new Error('Невалидна дата на документа.')
 const date=new Date(created+'T00:00:00Z')
 date.setUTCDate(date.getUTCDate()+7)
 return date.toISOString().slice(0,10)
}
