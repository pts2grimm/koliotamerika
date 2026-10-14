import { mkdir, writeFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

const origins=['https://darkturquoise-duck-750266.hostingersite.com','https://koliotamerika.bg']
const report={checkedAt:new Date().toISOString(),sites:[]}
const fetchPublic=async(url)=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'text/html, application/json','User-Agent':'Koliotamerika-SEO-Audit/1.0'}})
 if(!response.ok)throw new Error('HTTP '+response.status)
 return response
}
for(const origin of origins){
 const result={origin,cmsCount:0,checked:0,complete:false,errors:[],missingCMSFields:[],pages:[],duplicateTitles:[],duplicateDescriptions:[]}
 report.sites.push(result)
 try{
  const docs=[]
  for(let page=1;page<=5;page++){
   const url=new URL('/api/pages',origin);url.search=new URLSearchParams({limit:'100',page:String(page),depth:'0'}).toString()
   const json=await(await fetchPublic(url)).json()
   if(!Array.isArray(json.docs)||typeof json.hasNextPage!=='boolean')throw new Error('Unexpected public CMS response')
   docs.push(...json.docs)
   if(!json.hasNextPage){result.complete=true;break}
  }
  result.cmsCount=docs.length
  for(const doc of docs){
   const fields=['title','description'].filter(key=>!doc.seo?.[key]?.trim())
   if(fields.length)result.missingCMSFields.push({slug:doc.slug,fields})
  }
  const paths=[...new Set(['/', '/blog','/kontakti','/kalkulator','/targove','/targove/motori-atv','/targove/arhiv','/targove/motori-atv/arhiv',
   ...docs.filter(doc=>typeof doc.slug==='string'&&/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(doc.slug)).map(doc=>'/'+doc.slug)])]
  if(paths.length>110)result.complete=false
  let next=0
  await Promise.all(Array.from({length:3},async()=>{
   while(next<Math.min(paths.length,110)){
    const path=paths[next++]
    try{
     const response=await fetchPublic(new URL(path,origin))
     const dom=new JSDOM(await response.text()),d=dom.window.document
     const title=d.querySelector('title')?.textContent?.trim()||''
     const description=d.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()||''
     const row={path,title,description,h1:[...d.querySelectorAll('h1')].map(el=>el.textContent?.trim()),canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href')||'',robots:d.querySelector('meta[name="robots"]')?.getAttribute('content')||'',issues:[]}
     if(!title)row.issues.push('missing title')
     if(!description)row.issues.push('missing description')
     if(title.length>70)row.issues.push('title over 70 characters')
     if(description.length>180)row.issues.push('description over 180 characters')
     if(row.h1.length!==1)row.issues.push('expected one H1')
     if(!row.canonical)row.issues.push('missing canonical')
     result.pages.push(row);dom.window.close()
    }catch(error){result.errors.push({path,error:error.message})}
   }
  }))
  result.checked=result.pages.length
  if(result.errors.length)result.complete=false
  for(const [field,target] of [['title','duplicateTitles'],['description','duplicateDescriptions']]){
   const groups=new Map()
   for(const row of result.pages){const value=row[field].replace(/\s+/g,' ').trim().toLowerCase();if(value)groups.set(value,[...(groups.get(value)||[]),row.path])}
   result[target]=[...groups.values()].filter(paths=>paths.length>1)
  }
 }catch(error){result.errors.push({path:'/api/pages',error:error.message})}
 result.pages.sort((a,b)=>a.path.localeCompare(b.path))
 console.log(JSON.stringify({origin,checked:result.checked,cmsCount:result.cmsCount,complete:result.complete,errors:result.errors,missingCMSFields:result.missingCMSFields,issues:result.pages.filter(p=>p.issues.length).map(({path,issues})=>({path,issues})),duplicateTitles:result.duplicateTitles,duplicateDescriptions:result.duplicateDescriptions}))
}
await mkdir('reports',{recursive:true})
await writeFile('reports/public-seo-audit.json',JSON.stringify(report,null,2))
