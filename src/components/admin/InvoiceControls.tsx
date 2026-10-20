'use client'
import { useEffect, useRef } from 'react'
import type { TextFieldClientComponent } from 'payload'
import { Download, FileText } from 'lucide-react'
import { FieldLabel, FieldError, useField, useForm, useDocumentInfo, useFormFields, useFormModified } from '@payloadcms/ui'
import { bosMoney, validBosDate } from '../../lib/bos'
import { invoiceAmounts, invoiceDefaults, invoiceFees, invoiceParties, invoiceDueDate } from '../../lib/invoice'
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

/** Native calendar keeps existing YYYY-MM-DD records intact, including across timezones. */
export const InvoiceDateField:TextFieldClientComponent=({field,path:providedPath,readOnly})=>{
 const {id}=useDocumentInfo()
 const {dispatchFields,setModified}=useForm()
 const due=useFormFields(([fields])=>fields.dueDate?.value)
 const creationDate=useFormFields(([fields])=>fields.invoiceDate?.value)
 const touched=useRef(false)
 const {value,setValue,path,showError,disabled,formInitializing}=useField<string>({
  potentiallyStalePath:providedPath,
  validate:(value)=>(!field.required&&!value)||validBosDate(value)?true:'Избери валидна дата.',
 })
 useEffect(()=>{
  if(field.name!=='dueDate'||id||formInitializing||touched.current||value||typeof creationDate!=='string'||!validBosDate(creationDate))return
  setValue(invoiceDueDate(creationDate),true)
 },[field.name,id,creationDate,value,setValue,formInitializing])
 const locked=Boolean(readOnly||disabled)
 return <div className="field-type text koa-invoice-date">
  <FieldLabel label={field.label} path={path} required={field.required}/>
  <FieldError path={path} showError={showError}/>
  <input id={'field-'+path.replace(/\./g,'__')} name={path} type="date" value={value||''}
   required={field.required} readOnly={locked} aria-invalid={showError||undefined}
   onChange={event=>{
    const next=event.target.value
    if(locked)return
    touched.current=true
    if(field.name==='invoiceDate'&&!id&&validBosDate(next)&&(!due||(validBosDate(value)&&due===invoiceDueDate(value)))){
     dispatchFields({type:'UPDATE',path:'dueDate',value:invoiceDueDate(next)})
     setModified(true)
    }
    setValue(next)
   }}/>
  {field.name==='dueDate'&&<p className="koa-invoice-date__help">По подразбиране: 7 дни след датата на новия документ. Можеш да избереш друг падеж.</p>}
 </div>
}
