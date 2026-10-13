// Read-only diagnostics: print schema and counts, never credentials or lot records.
const base='https://catalog.eridan.software/api'
const spec=await (await fetch(base+'/openapi.json')).json()
const op=spec.paths?.['/api/lots']?.get||spec.paths?.['/lots']?.get
console.log('LOT_FILTER_SCHEMA',JSON.stringify(op?.parameters?.map(p=>({name:p.name,schema:p.schema,description:p.description}))))
const headers={Authorization:'Bearer '+process.env.ERIDAN_API_KEY,Accept:'application/json'}
for(const auction of ['copart','iaai'])for(const undated of [false,true]){
 const params=new URLSearchParams({auction,make__name:'BMW',item_type:'VEHTYPE_V',status:'active',has_images:'true',ordering:'-id',page:'1',page_size:'1000',...(undated?{sale_date__isnull:'true'}:{sale_date__gte:new Date().toISOString()})})
 const start=Date.now(),r=await fetch(base+'/lots?'+params,{headers,signal:AbortSignal.timeout(30000)})
 if(!r.ok){console.log('STREAM',{auction,undated,http:r.status});continue}
 const d=await r.json(),items=d.items||[]
 console.log('STREAM',JSON.stringify({auction,undated,items:items.length,named:items.filter(x=>typeof x.seller==='string'&&x.seller.trim()).length,blank:items.filter(x=>!x.seller?.trim()).length,hasNext:d.has_next,size:d.page_size,ms:Date.now()-start}))
}
