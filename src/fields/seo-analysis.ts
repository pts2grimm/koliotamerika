import type { Field } from 'payload'
export const seoAnalysisFields:Field[]=[{type:'collapsible',label:'SEO анализ',admin:{initCollapsed:false},fields:[
 {name:'focusKeyphrase',label:'Основна ключова фраза',type:'text',maxLength:150,
  access:{read:({req})=>req.user?.collection==='users',create:({req})=>req.user?.collection==='users',update:({req})=>req.user?.collection==='users'},
  admin:{description:'Редакционна цел за тази страница. Запазва се с документа; не се изпраща на търсачките.'}},
 {name:'seoAnalysis',type:'ui',admin:{components:{Field:'/src/components/admin/SEOAnalysis#SEOAnalysis'}}}
]}]
