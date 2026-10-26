'use client'
import {useDeferredValue,useMemo} from 'react'
import {useAllFormFields,useConfig,useDocumentInfo} from '@payloadcms/ui'
import {reduceFieldsToValues} from 'payload/shared'
import {CheckCircle2,Info,TriangleAlert} from 'lucide-react'
import {analyzeSEO,seoContent,words,type SEOEntity} from '../../lib/editor-seo-analysis'
import './seo-analysis.scss'
export function SEOAnalysis(){
 const [fields]=useAllFormFields()
 const {globalSlug,collectionSlug}=useDocumentInfo()
 const {config}=useConfig()
 const entity:SEOEntity=globalSlug==='homepage'?'homepage':collectionSlug==='cars'?'cars':'pages'
 const values=useDeferredValue(useMemo(()=>reduceFieldsToValues(fields,true),[fields]))
 const content=useMemo(()=>seoContent(values,entity),[values,entity])
 const report=useMemo(()=>analyzeSEO(content,config.serverURL||'https://koliotamerika.bg'),[content,config.serverURL])
 const labels={pass:'Добре',review:'Прегледай',info:'Информация'}
 return <section className="koa-seo-analysis" aria-label="Анализ на SEO">
  <header><div><h3>Анализ при редактиране</h3><p>Проверява текущите полета, включително незапазените промени.</p></div><strong className="koa-seo-analysis__summary" aria-live="polite">{words(content.phrase).length?report.passed+' / '+report.applicable+' проверки':'Добави ключова фраза'}</strong></header>
  <div className="koa-seo-analysis__stats"><span>{report.words.toLocaleString('bg-BG')} думи</span><span>{report.occurrences} точни срещания на фразата</span></div>
  <div className="koa-seo-analysis__snippet"><small>Примерен резултат в търсачка · изгледът може да се различава</small><div>{(config.serverURL||'https://koliotamerika.bg').replace(/\/$/,'')}{content.path}</div><strong>{content.title||'SEO заглавие'}</strong><p>{content.description||'Добави SEO описание на страницата.'}</p></div>
  <ul className="koa-seo-analysis__checks">{report.checks.map(check=>{
   const Icon=check.state==='pass'?CheckCircle2:check.state==='review'?TriangleAlert:Info
   return <li key={check.id} data-check={check.id} data-state={check.state}><Icon size={20} aria-hidden="true"/><div><strong>{check.label}</strong><p>{check.detail}</p></div><span>{labels[check.state]}</span></li>
  })}</ul>
  <p className="koa-seo-analysis__note">Това са редакционни насоки, не оценка или гаранция от Google. Съпоставянето е по точни думи, без разпознаване на синоними и словоформи. Не добавяй фразата насила само за зелена отметка.</p>
  <p className="koa-seo-analysis__note">Обхват: редактираното съдържание. Общото меню, автоматичните блокове и динамичните обяви не се анализират. Индексиране, скорост, работещи връзки и конкуриращи страници не се проверяват тук. Анализът работи в браузъра, без заявки при писане.</p>
 </section>
}
