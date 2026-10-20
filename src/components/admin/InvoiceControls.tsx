'use client'
import { Download, FileText } from 'lucide-react'
import { useDocumentInfo, useFormFields, useFormModified } from '@payloadcms/ui'
import { bosMoney } from '../../lib/bos'
import { invoiceAmounts, invoiceDefaults, invoiceFees, invoiceParties } from '../../lib/invoice'
export function InvoiceDownload(){
 const {id}=useDocumentInfo(),modified=useFormModified()
 return <div className="koa-bos-download">{id&&!modified?<a className="koa-bos-download__button" href={'/api/admin/invoices/'+encodeURIComponent(String(id))+'/pdf'}><Download size={17} aria-hidden="true"/>Изтегли Invoice PDF</a>:<span><FileText size={17} aria-hidden="true"/>Запази документа, за да изтеглиш актуален PDF.</span>}</div>
}
export function InvoiceSummary(){
 const values=useFormFields(([fields])=>{
  const count=Array.isArray(fields.vehicles?.rows)?fields.vehicles.rows.length:0
  return {paid:fields.paidAmount?.value,rows:Array.from({length:count},(_,i)=>Object.fromEntries(invoiceFees.map(([key])=>[key,fields['vehicles.'+i+'.'+key]?.value])))}
 })
 try{
  const {total,balance}=invoiceAmounts(values.rows,values.paid)
  return <div className="koa-bos-summary" aria-live="polite"><span>Общо <strong>$ {bosMoney(total)}</strong></span><span>Остатък <strong>$ {bosMoney(balance)}</strong></span></div>
 }catch{return <p className="koa-bos-note">Попълни валидни суми за автомобилите. Платеното не може да надвишава общата сума.</p>}
}
export function InvoiceBankNotice(){
 return <p className="koa-bos-note"><strong>{invoiceDefaults.bank.company}</strong><br/>{invoiceDefaults.bank.name}<br/>{invoiceDefaults.bank.bankAddress}<br/>SWIFT: {invoiceDefaults.bank.swift}</p>
}
export function InvoiceParties(){
 const snapshot=useFormFields(([fields])=>fields.partySnapshot?.value)
 let parties=invoiceDefaults
 if(snapshot){try{parties=invoiceParties(snapshot)}catch{return <p>Невалидни запазени данни за страните.</p>}}
 return <div className="koa-invoice-parties">
  <section><h3>Seller</h3><strong>{parties.seller.name}</strong><p>{parties.seller.address}<br/>{parties.seller.city}<br/>{parties.seller.statePostal}</p></section>
  <section><h3>Bill to</h3><strong>{parties.buyer.name}</strong><p>{parties.buyer.address}<br/>{parties.buyer.cityPostal}<br/>{parties.buyer.country}</p></section>
  <section><h3>Данни за плащане</h3><dl>{[
   ['Company',parties.bank.company],['Address',parties.bank.address],['Bank name',parties.bank.name],['Bank address',parties.bank.bankAddress],
   ['Swift Code',parties.bank.swift],['Account number',parties.bank.account],['Routing (paper & electronic)',parties.bank.routingElectronic],['Routing (wires)',parties.bank.routingWire],
  ].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
  <p className="koa-bos-note">{!snapshot&&<>Преди първия документ попълни <a href="/admin/globals/invoice-settings">Настройки на Invoice</a>. Банковите номера се добавят при запис.<br/></>}Постоянните данни се запазват с всеки документ. Всички суми са в USD.</p>
 </div>
}
