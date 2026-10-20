import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Invoice } from '../payload-types'
import { bosMoney, bosToday } from './bos'
import { invoiceAmounts, invoiceFees, invoiceParties, invoicePastDue } from './invoice'
export class InvoiceLayoutError extends Error {}
let fonts:Promise<Buffer[]>|undefined
const loadFonts=()=>fonts ||= Promise.all(['Regular','Bold'].map(style=>readFile(path.join(process.cwd(),'assets/fonts/NotoSans-'+style+'.ttf')))).catch(error=>{fonts=undefined;throw error})
export async function createInvoicePDF(doc:Invoice,printed=bosToday()){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit)
 const bytes=await loadFonts(),regular=await pdf.embedFont(bytes[0],{subset:true}),bold=await pdf.embedFont(bytes[1],{subset:true})
 const parties=invoiceParties(doc.partySnapshot),sums=invoiceAmounts(doc.vehicles,doc.paidAmount)
 const supported=new Set(regular.getCharacterSet())
 const black=rgb(0,0,0),gray=rgb(.88,.88,.88)
 let page:PDFPage=pdf.addPage([612,792])
 pdf.setTitle('Invoice '+doc.invoiceNumber);pdf.setAuthor(parties.seller.name);pdf.setSubject('Vehicle transport and services invoice — USD')
 const width=(value:string,size:number,strong=false)=>(strong?bold:regular).widthOfTextAtSize(value,size)
 const text=(value:unknown,x:number,y:number,w:number,size=8,strong=false,maxLines=1,align:'left'|'right'|'center'='left')=>{
  const clean=String(value??'').replace(/\s+/g,' ').trim()
  if(!clean)return 0
  for(const char of clean)if(!supported.has(char.codePointAt(0)!))throw new InvoiceLayoutError('PDF шрифтът не поддържа символ: '+char)
  for(let current=size;current>=5.5;current-=.25){
   const rows:string[]=['']
   for(const word of clean.split(' ')){
    let candidate=rows[rows.length-1]?rows[rows.length-1]+' '+word:word
    if(width(candidate,current,strong)<=w)rows[rows.length-1]=candidate
    else{
     if(width(word,current,strong)>w){
      for(const char of word){
       candidate=rows[rows.length-1]+char
       if(width(candidate,current,strong)>w)rows.push(char)
       else rows[rows.length-1]=candidate
      }
     }else rows.push(word)
    }
   }
   if(rows.length<=maxLines){
    rows.forEach((row,i)=>page.drawText(row,{x:x+(align==='right'?w-width(row,current,strong):align==='center'?(w-width(row,current,strong))/2:0),y:792-y-current-i*(current+2),font:strong?bold:regular,size:current,color:black}))
    return rows.length*(current+2)
   }
  }
  throw new InvoiceLayoutError('Текстът е твърде дълъг за PDF: '+clean.slice(0,45)+'… Съкрати полето.')
 }
 const line=(x:number,y:number,x2:number,y2:number)=>page.drawLine({start:{x,y:792-y},end:{x:x2,y:792-y2},thickness:.5,color:black})
 const box=(x:number,y:number,w:number,h:number,fill=false)=>page.drawRectangle({x,y:792-y-h,width:w,height:h,borderColor:black,borderWidth:.5,...(fill?{color:gray}:{})})
 const pair=(label:string,value:unknown,x:number,y:number,w=250)=>{text(label,x,y,85,7);text(value,x+88,y,w-88,7,false,2)}
 text('LUXURY',36,35,140,24,true)
 text('CARS TRADING',36,66,140,11,true)
 text('INVOICE',36,92,140,10,true)
 text('Company: '+parties.bank.company,205,34,371,7,true)
 text('Address: '+parties.bank.address,205,46,371,7,false,2)
 const bankLines=[
  'Bank name: '+parties.bank.name,'Bank address: '+parties.bank.bankAddress,
  'Swift Code: '+parties.bank.swift,'Account number: '+parties.bank.account,
  'Routing number: '+parties.bank.routingElectronic+' (paper & electronic)',
  'Routing number: '+parties.bank.routingWire+' (wires)',
 ]
 bankLines.forEach((value,i)=>text(value,312,66+i*11,264,6.5))
 line(36,143,576,143)
 text('Seller:',36,154,250,9,true)
 text(parties.seller.name,36,169,250,9,true)
 text(parties.seller.address,36,184,250,9)
 text(parties.seller.city,36,199,250,9)
 text(parties.seller.statePostal,36,214,250,9)
 text('Bill to:',36,240,250,9,true)
 text('Buyer: '+parties.buyer.name,36,255,250,9,true)
 text(parties.buyer.address,36,270,250,9)
 text(parties.buyer.cityPostal,36,285,250,9)
 text(parties.buyer.country,36,300,250,9)
 text('Invoice:',306,154,270,9,true)
 const dates=[['Number',doc.invoiceNumber],['Creation date',doc.invoiceDate],['Due date',doc.dueDate||'—'],['Past due days',String(invoicePastDue(doc.dueDate,sums.balance,printed))],['Invoice printed',printed]]
 dates.forEach(([label,value],i)=>{const y=170+i*17;box(306,y,270,17);line(426,y,426,y+17);text(label+':',310,y+3,112,7);text(value,430,y+3,142,8,i===0)})
 box(416,272,160,18,true);box(416,290,160,22)
 text('BALANCE DUE (USD)',420,276,152,8,true,1,'center')
 text('$'+bosMoney(sums.balance),420,295,152,10,true,1,'center')
 line(36,322,576,322)
 const cargo=[doc.shipper,doc.origin,doc.carrierName,doc.shippingDate,doc.consignee,doc.destination,doc.bookingNumber,doc.containerNumber].some(Boolean)
 let top=338
 if(cargo){
  box(36,top,540,16,true);text('Cargo information',40,top+3,532,8,true,1,'center')
  box(36,top+16,540,81);line(306,top+16,306,top+97)
  pair('Shipper:',doc.shipper,40,top+22);pair('Origin:',doc.origin,40,top+40)
  pair('Carrier name:',doc.carrierName,40,top+58);pair('Shipping date:',doc.shippingDate,40,top+76)
  pair('Consignee:',doc.consignee,310,top+22);pair('Destination:',doc.destination,310,top+40)
  pair('Booking number:',doc.bookingNumber,310,top+58);pair('Container:',doc.containerNumber,310,top+76)
  top+=111
 }
 const labels=['Description',...invoiceFees.map(([,label])=>label),'Total']
 const widths=[140,...Array(8).fill(50)] as number[]
 const tableHeader=()=>{
  let x=36
  labels.forEach((label,i)=>{box(x,top,widths[i],30,true);text(label,x+3,top+6,widths[i]-6,7,true,2,'center');x+=widths[i]})
  top+=30
 }
 const continuation=()=>{
  page=pdf.addPage([612,792]);text(parties.seller.name,36,30,350,11,true);text('Invoice '+doc.invoiceNumber,36,50,540,10,true)
  text('USD · Continued',36,67,540,8);top=90;tableHeader()
 }
 tableHeader()
 doc.vehicles.forEach((vehicle,index)=>{
  if(top+66>730)continuation()
  let x=36
  widths.forEach(w=>{box(x,top,w,66);x+=w})
  text([vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(' '),40,top+5,132,8,true,2)
  text('VIN: '+vehicle.vin,40,top+29,132,6.5,true)
  text('Lot: '+vehicle.lot,40,top+43,132,7,false,2)
  const amounts=[...invoiceFees.map(([key])=>vehicle[key]),sums.rowTotals[index]]
  amounts.forEach((value,i)=>text(bosMoney(value),179+i*50,top+26,44,7,i===7,1,'right'))
  top+=66
 })
 // Reserve the complete totals and payment block; never overlap a table row.
 if(top+185>740){page=pdf.addPage([612,792]);text(parties.seller.name,36,30,350,11,true);text('Invoice '+doc.invoiceNumber,36,50,540,10,true);top=80}
 const settlement=[['Total',sums.total],['Payment',doc.paidAmount],['Balance due',sums.balance]] as const
 settlement.forEach(([label,value],i)=>{text(label+':',376,top+8+i*18,124,8,i!==1,1,'right');text('$'+bosMoney(value),504,top+8+i*18,72,8,i!==1,1,'right')})
 top+=72
 if(doc.notes)top+=text(doc.notes,36,top,540,8,false,5)+10
 text('Payment instruction:',36,top,540,9,true);top+=17
 text('When making the payment, please select the fee type: OUR (all bank fees are paid by the sender)',36,top,540,8,true,2);top+=24
 text('to ensure that the full invoice amount is received.',36,top,540,8)
 const pages=pdf.getPages()
 pages.forEach((item,index)=>{page=item;line(36,758,576,758);text('Invoice '+doc.invoiceNumber+' | USD',36,765,400,7);text('Page '+(index+1)+' / '+pages.length,450,765,126,7,false,1,'right')})
 return pdf.save()
}
