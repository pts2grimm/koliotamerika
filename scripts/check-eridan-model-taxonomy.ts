import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 for(const make of ['BMW','MERCEDES-BENZ','AUDI','VOLKSWAGEN','TOYOTA','PORSCHE','FORD','HONDA','CHEVROLET','NISSAN','LEXUS','HYUNDAI','KIA']){
  const result=await request('/series',new URLSearchParams({make__name:make,page:'1',page_size:'1000',ordering:'id'})) as {items:any[],count:number}
  console.log('SERIES',JSON.stringify({make,count:result.count,returned:result.items.length,names:result.items.map(x=>x.name),sample:result.items.slice(0,3)}))
 }
 for(const auction of ['copart','iaai'])for(const series of ['', '3 SERIES']){
  const p=new URLSearchParams({make__name:'BMW',auction,status:'active',has_images:'true',sale_date__gte:new Date().toISOString(),page:'1',page_size:'100',ordering:'-id'})
  if(series)p.set('series__name',series)
  const r=await request('/lots',p) as {items:any[],has_next:boolean}
  console.log('SERIES_COVERAGE',JSON.stringify({auction,series,items:r.items.length,hasNext:r.has_next,missingSeries:r.items.filter(x=>!x.series?.name).length,taxonomy:[...new Set(r.items.map(x=>JSON.stringify([x.model?.name,x.series?.name])))]}))
 }
}
main().catch(()=>{console.error('TAXONOMY_FAILED');process.exitCode=1})
