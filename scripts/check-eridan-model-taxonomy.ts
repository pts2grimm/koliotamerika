import { createEridanTransport } from '../src/lib/auction-providers/eridan-transport'
async function main(){
 const schema=await (await fetch('https://catalog.eridan.software/api/openapi.json')).json()
 for(const [path, spec] of Object.entries(schema.paths) as [string,any][])if(/\/(?:series|models|lots)\/?$/.test(path)) console.log('TAXONOMY_SCHEMA',JSON.stringify({path,parameters:spec.get.parameters,responses: /lots/.test(path)?undefined:spec.get.responses}))
 const request=createEridanTransport({apiKey:process.env.ERIDAN_API_KEY,fetch})
 for(const make of ['BMW','MERCEDES-BENZ','AUDI','VOLKSWAGEN','TOYOTA','PORSCHE']){
  const result=await request('/models',new URLSearchParams({make__name:make,page:'1',page_size:'1000',ordering:'id'})) as {items:any[],count:number}
  console.log('MODELS',JSON.stringify({make,count:result.count,returned:result.items.length,fields:Object.keys(result.items[0]||{}),names:result.items.map(x=>x.name),sample:result.items.slice(0,3)}))
 }
}
main().catch(()=>{console.error('TAXONOMY_FAILED');process.exitCode=1})
