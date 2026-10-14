import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
import { modelFamily } from '../src/lib/auction-providers/model-families'
import { eridanMakeAliases } from '../src/lib/auction-providers/make-aliases'
async function main(){
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 const aliases=eridanMakeAliases('CAN-AM')
 const directory:{id:number;name:string}[]=[]
 for(const make of aliases){
  for(let page=1;page<=5;page++){
   const data=await request('/models',new URLSearchParams({make__name:make,ordering:'id',page:String(page),page_size:'1000'})) as {items:{id:number;name:string}[];count:number}
   directory.push(...data.items)
   if(page*1000>=data.count)break
   if(page===5)throw new Error('incomplete-directory')
  }
 }
 console.log('RENEGADE_DIRECTORY',JSON.stringify(directory.filter(x=>/renegade/i.test(x.name)).map(x=>({...x,family:modelFamily('CAN-AM',x.name)}))))
 const cutoff=new Date().toISOString()
 for(const auction of ['copart','iaai'])for(const type of ['VEHTYPE_A','VEHTYPE_M']){
  const counts=new Map<string,{model:string;dated:number;undated:number;withImages:number}>()
  let complete=true,all=0
  for(const undated of [false,true])for(let page=1;page<=4;page++){
   const data=await request('/lots',new URLSearchParams({makes:aliases.join(','),auction,item_type:type,status:'active',ordering:'id',page:String(page),page_size:'1000',...(undated?{sale_date__isnull:'true'}:{sale_date__gte:cutoff})})) as {items:{model:{name:string};images:string[]}[];has_next:boolean}
   for(const item of data.items){
    all++
    const name=item.model?.name||''
    if(!/renegade/i.test(name))continue
    const c=counts.get(name)||{model:name,dated:0,undated:0,withImages:0}
    c[undated?'undated':'dated']++
    if(item.images?.length)c.withImages++
    counts.set(name,c)
   }
   if(!data.has_next)break
   if(page===4)complete=false
  }
  console.log('RENEGADE_LOTS',JSON.stringify({auction,type,complete,all,models:[...counts.values()]}))
 }
}
main().catch(()=>{console.error('RENEGADE_AUDIT_FAILED');process.exitCode=1})
