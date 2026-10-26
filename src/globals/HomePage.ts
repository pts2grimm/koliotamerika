import type { GlobalConfig } from 'payload'
import { homeFields } from './home-fields'
import { invalidatePublicContent } from '../lib/content-cache-hooks'
import { legacyHomeDefaults, mergeHome } from '../lib/home-defaults'
export const HomePage:GlobalConfig={
 slug:'homepage',label:'Начална страница',
 admin:{group:false,description:'Всички секции и SEO на началната. Запазването прилага редакциите публично. Списъците поддържат добавяне, премахване и пренареждане. Автомобилите и статиите се редактират в съответните раздели.'},
 access:{read:()=>true,update:({req})=>req.user?.collection==='users'},
 hooks:{
  afterRead:[async({doc,req})=>doc.initialized?doc:{...doc,...await legacyHomeDefaults(req.payload),initialized:false}],
  beforeValidate:[async({data,originalDoc,req})=>originalDoc?.initialized?data:mergeHome(await legacyHomeDefaults(req.payload),data||{})],
  beforeChange:[({data})=>({...data,initialized:true})],
  afterChange:[invalidatePublicContent],
 },
 fields:[
  {name:'initialized',type:'checkbox',admin:{hidden:true}},
  ...homeFields.map(field=>({type:'collapsible' as const,label:'label' in field?field.label:undefined,admin:{initCollapsed:true},fields:[field]})),
 ],
}
