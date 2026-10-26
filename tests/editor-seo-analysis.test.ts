import assert from 'node:assert/strict'
import test from 'node:test'
import {analyzeSEO,seoContent,phraseCount,transliterate} from '../src/lib/editor-seo-analysis'
const rich=(text:string)=>({root:{type:'root',children:[{type:'paragraph',children:[{type:'text',text}]}]}})
const state=(doc:any,id:string,entity:'pages'|'cars'|'homepage'='pages')=>analyzeSEO(seoContent(doc,entity)).checks.find(x=>x.id===id)?.state
test('Bulgarian whole-word matching, punctuation, whitespace and URL transliteration',()=>{
 assert.equal(phraseCount('КОЛИ — от Америка. Коли\u00a0от Америка!','коли от америка'),2)
 assert.equal(phraseCount('автоколи количка колите','коли'),0)
 assert.equal(phraseCount('коли коли коли','коли коли'),1)
 assert.equal(phraseCount('anything','   '),0)
 assert.equal(transliterate('САЩ, хомологация'),'sasht, homologatsiya')
 assert.equal(state({focusKeyphrase:'коли от САЩ',slug:'vnos-na-koli-ot-sasht'},'phrase-url'),'pass')
 assert.equal(state({focusKeyphrase:'коли от САЩ',slug:'vnos-na-koli-ot-kanada'},'phrase-url'),'review')
 assert.equal(state({focusKeyphrase:'коли от САЩ'},'phrase-url','homepage'),'info')
})
test('metadata excluded from body; inline formatting, sections and links retained; input unchanged',()=>{
 const doc={focusKeyphrase:'Коли от Америка',title:'Ръководство',seo:{title:'Коли от Америка'},intro:'Покупка',body:{root:{type:'root',children:[{type:'paragraph',children:[{type:'text',text:'Ко'},{type:'text',text:'ли от Америка'}]},{type:'link',fields:{url:'/kontakti'},children:[]}]}},sections:[{heading:'Коли от Америка: въпроси',body:'Отговор'}]}
 const before=JSON.stringify(doc),input=seoContent(doc,'pages')
 assert.equal(phraseCount(input.text,'Коли от Америка'),2)
 assert.equal(input.links.length,1)
 assert.equal(state(doc,'phrase-heading'),'pass')
 assert.equal(JSON.stringify(doc),before)
 const onlySEO={focusKeyphrase:'единствена фраза',seo:{title:'единствена фраза'},title:'Друго',body:rich('Различен текст')}
 assert.equal(state(onlySEO,'phrase-title'),'pass')
 assert.equal(state(onlySEO,'phrase-content'),'review')
})
test('homepage disabled sections and hidden commission excluded',()=>{
 const doc={focusKeyphrase:'секретна фраза',hero:{title:'Начало',description:'Увод'},price:{enabled:false,body:rich('секретна фраза')},commission:{title:'секретна фраза'},faq:{enabled:false,items:[{question:'секретна фраза',answer:rich('секретна фраза')}]},seo:{title:'секретна фраза'}}
 assert.equal(state(doc,'phrase-content','homepage'),'review')
 assert.equal(state({...doc,price:{enabled:true,body:rich('секретна фраза')}},'phrase-content','homepage'),'pass')
})
test('unknown media and empty phrase are neutral; short content has no arbitrary word minimum',()=>{
 assert.equal(state({image:123},'images'),'info')
 assert.equal(state({image:{id:1,alt:'Автомобил'}},'images'),'pass')
 assert.equal(state({image:{id:1,alt:''}},'images'),'review')
 const report=analyzeSEO(seoContent({title:'Контакти',intro:'Свържете се с нас.'},'pages'))
 assert.equal(report.checks.find(x=>x.id==='phrase-h1')?.state,'info')
 assert.equal(report.checks.some(x=>x.id==='minimum-words'),false)
 assert.equal(state({hero:{imageAlt:'Описание без снимка'}},'images','homepage'),'info')
})
test('noindex, extra H1, excessive length and repetition surface warnings',()=>{
 const doc={title:'Коли',focusKeyphrase:'коли',seo:{noIndex:true,title:'x'.repeat(71),description:'x'.repeat(181)},body:{root:{children:[{type:'heading',tag:'h1',children:[{type:'text',text:'Втори H1'}]},{type:'paragraph',children:[{type:'text',text:'коли коли коли коли коли'}]}]}}}
 for(const id of ['noindex','h1','title-length','description-length','repetition'])assert.equal(state(doc,id),'review')
})
test('car description and equipment use car URL; SEO description is excluded from body',()=>{
 const input=seoContent({title:'Ford Mustang',slug:'ford-mustang',focusKeyphrase:'Ford Mustang',description:'Първи абзац.\n\nВтори абзац.',features:[{label:'Кожен салон'}],seo:{description:'Невидима метафраза'}},'cars')
 assert.equal(input.path,'/avtomobili/ford-mustang')
 assert.match(input.text,/Втори абзац/);assert.match(input.text,/Кожен салон/)
 assert.doesNotMatch(input.text,/Невидима метафраза/)
})

test('empty copy has no readability pass',()=>{assert.equal(state({},'paragraphs'),'info')})
