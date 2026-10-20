import type { GlobalConfig, Field } from 'payload'
const digits=(name:string,label:string,min:number,max:number):Field=>({
 name,label,type:'text',required:true,minLength:min,maxLength:max,
 validate:(v:unknown)=>typeof v==='string'&&new RegExp('^[0-9]{'+min+','+max+'}$').test(v)?true:'Въведи '+(min===max?min:min+'–'+max)+' цифри.',
})
export const InvoiceSettings:GlobalConfig={
 slug:'invoice-settings',label:'Настройки на Invoice',
 admin:{group:'Документи',description:'Платежните номера се съхраняват само в защитената база. Попълни ги еднократно преди създаване на първия Invoice. Промяната им важи само за нови документи; старите запазват своето копие.'},
 access:{read:({req})=>req.user?.collection==='users',update:({req})=>req.user?.collection==='users'},
 fields:[
  {name:'bankInfo',type:'ui',admin:{components:{Field:'/src/components/admin/InvoiceControls#InvoiceBankNotice'}}},
  digits('account','Bank of America — Account number',6,20),
  digits('routingElectronic','Routing number — paper & electronic',9,9),
  digits('routingWire','Routing number — wires',9,9),
 ],
}
