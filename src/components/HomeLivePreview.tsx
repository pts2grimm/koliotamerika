'use client'
import {useEffect,useState} from 'react'
import {EditableHomeView,type HomeViewProps} from './EditableHomeView'
import {resolveHome} from '@/lib/home-content'

export function HomeLivePreview(props:HomeViewProps){
 const [content,setContent]=useState(props.content)
 const [status,setStatus]=useState('Преглед на запазеното съдържание')
 useEffect(()=>{
  const sender=window.opener||(window.parent!==window?window.parent:null)
  const origin=window.location.origin
  let revision=0,timer:ReturnType<typeof setTimeout>|undefined,closed=false,lastRelationship=''
  const cache=new Map<string,Promise<any>>()
  function seed(value:any){
   if(!value||typeof value!=='object')return
   if(value.id&&typeof value.url==='string')cache.set('media/'+value.id,Promise.resolve(value))
   if(value.id&&typeof value.slug==='string'&&value.kind)cache.set('pages/'+value.id,Promise.resolve(value))
   for(const item of Object.values(value))if(item&&typeof item==='object')seed(item)
  }
  seed(props.content)
  function relationship(collection:'media'|'pages',id:string|number){
   const key=collection+'/'+id
   if(!cache.has(key)){
    if(cache.size>=80)cache.delete(cache.keys().next().value!)
    const request=fetch('/api/'+key+'?depth=1',{credentials:'same-origin',signal:AbortSignal.timeout(10000)})
     .then(async response=>{if(!response.ok)throw new Error('Preview relationship unavailable');return response.json()})
     .catch(error=>{cache.delete(key);throw error})
    cache.set(key,request)
   }
   return cache.get(key)!
  }
  const isID=(value:unknown):value is string|number=>(typeof value==='number'&&Number.isInteger(value)&&value>0)||(typeof value==='string'&&/^\d+$/.test(value))
  async function populate(value:any):Promise<any>{
   if(Array.isArray(value))return Promise.all(value.map(populate))
   if(!value||typeof value!=='object')return value
   const entries=await Promise.all(Object.entries(value).map(async([key,item])=>{
    if(key==='image'&&isID(item))return [key,await relationship('media',item)]
    if(key==='value'&&(value.relationTo==='media'||value.relationTo==='pages')&&isID(item))return [key,await relationship(value.relationTo,item)]
    return [key,await populate(item)]
   }))
   return Object.fromEntries(entries)
  }
  function receive(event:MessageEvent){
   if(event.origin!==origin||event.source!==sender||!sender||event.data?.type!=='payload-live-preview'||event.data.globalSlug!=='homepage'||!event.data.data||typeof event.data.data!=='object')return
   const incoming=event.data.data,current=++revision
   const update=JSON.stringify(event.data.externallyUpdatedRelationship||null)
   if(lastRelationship&&update!==lastRelationship)cache.clear()
   lastRelationship=update
   clearTimeout(timer)
   timer=setTimeout(async()=>{
    try{
     const next=await populate(incoming)
     if(!closed&&current===revision){setContent(resolveHome(next));setStatus('Преглед в реално време · Публикува се с „Запази“')}
    }catch{
     if(!closed&&current===revision){setContent(resolveHome(incoming));setStatus('Текстът е обновен. Снимка или свързано съдържание не се зареди.')}
    }
   },60)
  }
  window.addEventListener('message',receive)
  sender?.postMessage({type:'payload-live-preview',ready:true},origin)
  return ()=>{closed=true;clearTimeout(timer);window.removeEventListener('message',receive)}
 },[props.content])
 useEffect(()=>{document.title=content.seo.title||'Преглед на началната страница'},[content.seo.title])
 return <><aside className="home-live-status" role="status">{status}</aside><EditableHomeView {...props} content={content}/></>
}
