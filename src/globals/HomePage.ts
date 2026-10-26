import type { GlobalConfig } from 'payload'
import { homeFields } from './home-fields'
import { invalidatePublicContent } from '../lib/content-cache-hooks'
import { legacyHomeDefaults, mergeHome } from '../lib/home-defaults'
export const HomePage:GlobalConfig={
 slug:'homepage',label:'Начална страница',
 admin:{livePreview:{url:'/home-preview',breakpoints:[{name:'desktop',label:'Компютър',width:1440,height:900},{name:'tablet',label:'Таблет',width:768,height:1024},{name:'mobile',label:'Телефон',width:390,height:844}]},group:false,description:'Всички секции и SEO на началната. Запазването прилага редакциите публично. Списъците поддържат добавяне, премахване и пренареждане. Автомобилите и статиите се редактират в съответните раздели.'},
 access:{read:()=>true,update:({req})=>req.user?.collection==='users'},
 hooks:{
  afterRead:[async({doc,req})=>doc.initialized?doc:{...doc,...await legacyHomeDefaults(req.payload),initialized:false}],
  beforeOperation:[async({args,operation,req})=>{
   if(operation==='update'&&'data' in args){
    // Populate before field hooks insert empty arrays for absent fields.
    const existing=await req.payload.db.findGlobal({slug:'homepage',req})
    if(!existing?.initialized)Object.assign(args,{data:mergeHome(await legacyHomeDefaults(req.payload),(args.data||{}) as Record<string,any>)})
   }
   return args
  }],
  beforeChange:[({data})=>({...data,initialized:true})],
  afterChange:[invalidatePublicContent],
 },
 fields:[
  {name:'initialized',type:'checkbox',admin:{hidden:true}},
  ...homeFields.map(field=>({type:'collapsible' as const,label:'label' in field?field.label:undefined,admin:{initCollapsed:true},fields:[field]})),
 ],
}
