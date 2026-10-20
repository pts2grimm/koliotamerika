import { APIError, type Access, type CollectionConfig, type Field } from 'payload'
import { bosToday, validBosDate, validBosMoney } from '../lib/bos'
import { invoiceAmounts, invoiceSnapshot, invoiceFees } from '../lib/invoice'
const staff:Access=({req})=>req.user?.collection==='users'
const text=(name:string,label:string,required=false,maxLength=80):Field=>({
 name,label,type:'text',required,maxLength,
 validate:(v:unknown)=>v==null||v===''?required?'Полето е задължително.':true:typeof v==='string'&&v.trim().length>0&&v.length<=maxLength&&!/[\u0000-\u001f\u007f]/.test(v)?true:'Въведи валиден текст без управляващи символи.',
})
const date=(name:string,label:string,required=false):Field=>({
 name,label,type:'text',required,admin:{placeholder:'YYYY-MM-DD'},
 validate:(v:unknown)=>(!required&&!v)||validBosDate(v)?true:'Въведи валидна дата: YYYY-MM-DD.',
})
const money=(name:string,label:string):Field=>({
 name,label,type:'number',required:true,min:0,max:99999999.99,defaultValue:0,
 validate:(v:unknown)=>validBosMoney(v)?true:'Въведи неотрицателна сума с най-много два знака.',
})
export const Invoices:CollectionConfig={
 slug:'invoices',typescript:{interface:'Invoice'},lockDocuments:false,
 labels:{singular:'Invoice документ',plural:'Invoice документи'},
 admin:{group:'Документи',useAsTitle:'invoiceNumber',defaultColumns:['invoiceNumber','invoiceDate','total','paidAmount','balance','updatedAt'],
 listSearchableFields:['invoiceNumber','vehicles.vin','vehicles.make','vehicles.model','vehicles.lot'],
 description:'Транспортни разходи и услуги в USD. Един ред за всеки автомобил. Запази документа преди PDF експорт.',
 components:{edit:{beforeDocumentControls:['/src/components/admin/InvoiceControls#InvoiceDownload']}}},
 access:{create:staff,read:staff,update:staff,delete:staff},
 hooks:{beforeValidate:[async({data,originalDoc,operation,req})=>{
  if(!data)return data
  if(typeof data.invoiceNumber==='string')data.invoiceNumber=data.invoiceNumber.trim().toUpperCase()
  if(operation==='create'){
   const settings=await req.payload.findGlobal({slug:'invoice-settings',req,overrideAccess:false})
   try{data.partySnapshot=invoiceSnapshot(settings)}catch(error){throw new APIError((error as Error).message,400)}
  }else data.partySnapshot=originalDoc?.partySnapshot
  if(operation==='create'&&data.paidAmount===undefined)data.paidAmount=0
  const values={...originalDoc,...data}
  if(Array.isArray(values.vehicles)){
   data.vehicles=values.vehicles.map((row:Record<string,unknown>)=>{
    const item={...row}
    if(typeof item.vin==='string')item.vin=item.vin.trim().toUpperCase()
    for(const [key] of invoiceFees)if(item[key]===undefined)item[key]=0
    return item
   })
  }
  try{
   const sums=invoiceAmounts(data.vehicles??values.vehicles,values.paidAmount)
   data.vehicles=data.vehicles.map((row:Record<string,unknown>,i:number)=>({...row,total:sums.rowTotals[i]}))
   data.total=sums.total;data.balance=sums.balance
   if(values.dueDate&&validBosDate(values.dueDate)&&validBosDate(values.invoiceDate)&&values.dueDate<values.invoiceDate)throw new Error('Падежът не може да бъде преди датата на документа.')
  }catch(error){throw new APIError((error as Error).message,400)}
  return data
 }]},
 fields:[
  {name:'invoiceNumber',label:'Invoice number / Номер',type:'text',required:true,unique:true,maxLength:40,admin:{description:'Въвежда се ръчно. Номерът трябва да е уникален.'},validate:(v:unknown)=>typeof v==='string'&&/^[A-Z0-9][A-Z0-9/_-]{0,39}$/.test(v)?true:'Използвай латински букви, цифри, /, _ или - (до 40 знака).'},
  {type:'row',fields:[{...date('invoiceDate','Creation date / Дата',true),defaultValue:()=>bosToday()} as Field,date('dueDate','Due date / Падеж')]},
  {name:'partySnapshot',type:'json',required:true,admin:{hidden:true}},
  {type:'tabs',tabs:[
   {label:'Автомобили и суми',fields:[
    {name:'vehicles',label:'Автомобили',type:'array',required:true,minRows:1,maxRows:50,labels:{singular:'Автомобил',plural:'Автомобили'},fields:[
     {name:'vin',label:'VIN',type:'text',required:true,maxLength:17,index:true,validate:(v:unknown)=>typeof v==='string'&&/^[A-HJ-NPR-Z0-9]{17}$/.test(v)?true:'VIN трябва да е 17 знака, без I, O и Q.'},
     {type:'row',fields:[text('make','Make / Марка',true,40),text('model','Model / Модел',true,60),text('lot','Lot / Лот',true,40)]},
     {name:'year',label:'Година (по избор)',type:'number',min:1900,max:2100,validate:(v:unknown)=>v==null||typeof v==='number'&&Number.isInteger(v)&&v>=1900&&v<=2100?true:'Въведи валидна година.'},
     {type:'row',fields:invoiceFees.slice(0,3).map(([key,label])=>money(key,label+' ($)'))},
     {type:'row',fields:invoiceFees.slice(3).map(([key,label])=>money(key,label+' ($)'))},
     {name:'total',label:'Total / Общо за автомобила ($)',type:'number',admin:{readOnly:true}},
    ]},
    money('paidAmount','Payment / Платена сума ($)'),
    {name:'summary',type:'ui',admin:{components:{Field:'/src/components/admin/InvoiceControls#InvoiceSummary'}}},
    {type:'row',fields:[{name:'total',label:'Total / Общо ($)',type:'number',admin:{readOnly:true}},{name:'balance',label:'Balance due / Остатък ($)',type:'number',admin:{readOnly:true}}]},
   ]},
   {label:'Транспорт и бележки',fields:[
    {type:'row',fields:[text('shipper','Shipper'),text('origin','Origin')]},
    {type:'row',fields:[text('consignee','Consignee'),text('destination','Destination')]},
    {type:'row',fields:[text('carrierName','Carrier name'),text('bookingNumber','Booking number',false,40)]},
    {type:'row',fields:[date('shippingDate','Shipping date'),text('containerNumber','Container number',false,40)]},
    {name:'notes',label:'Бележки в PDF',type:'textarea',maxLength:500},
   ]},
   {label:'Страни и плащане',fields:[{name:'parties',type:'ui',admin:{components:{Field:'/src/components/admin/InvoiceControls#InvoiceParties'}}}]},
  ]},
 ],
}
