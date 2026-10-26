// Browser-only editorial checks. No requests, persistence or changes to public metadata.
export type SEOEntity='homepage'|'pages'|'cars'
type Doc=Record<string,any>
export type SEOCheck={id:string;label:string;state:'pass'|'review'|'info';detail:string}
export type SEOContent={phrase:string;title:string;description:string;h1:string;intro:string;path:string;text:string;headings:string[];paragraphs:string[];links:string[];alts:(string|null)[];noIndex:boolean;extraH1:number;fallbackTitle:boolean;fallbackDescription:boolean;homepage:boolean}
export const words=(value:string)=>value.normalize('NFC').toLocaleLowerCase('bg').match(/[\p{L}\p{N}]+/gu)||[]
export function phraseCount(text:string,phrase:string):number{
 const hay=words(text),needle=words(phrase)
 if(!needle.length)return 0
 let count=0
 for(let i=0;i<=hay.length-needle.length;i++){
  if(needle.every((word,j)=>hay[i+j]===word)){count++;i+=needle.length-1}
 }
 return count
}
const alphabet:Record<string,string>={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya'}
export const transliterate=(text:string)=>[...text.toLocaleLowerCase('bg')].map(char=>alphabet[char]??char).join('')
const str=(value:unknown)=>typeof value==='string'?value:''
const list=(value:unknown):Doc[]=>Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[]
export function seoContent(doc:Doc,entity:SEOEntity):SEOContent{
 const home=entity==='homepage',car=entity==='cars'
 const content:SEOContent={phrase:str(doc.focusKeyphrase).trim(),title:str(doc.seo?.title)||str(doc.title),description:str(doc.seo?.description)||(car?str(doc.description):str(doc.intro)).slice(0,160),h1:home?str(doc.hero?.title):str(doc.title),intro:home?str(doc.hero?.description):car?str(doc.description).split(/\n\s*\n/)[0]:str(doc.intro),path:home?'/':(car?'/avtomobili/':'/')+str(doc.slug),text:'',headings:[],paragraphs:[],links:[],alts:[],noIndex:doc.seo?.noIndex===true,extraH1:0,fallbackTitle:!doc.seo?.title,fallbackDescription:!doc.seo?.description,homepage:home}
 const pieces:string[]=[]
 const add=(value:unknown)=>{const text=str(value).trim();if(text)pieces.push(text)}
 const paragraph=(value:unknown)=>{const text=str(value).trim();if(text){content.paragraphs.push(text);add(text)}}
 const heading=(value:unknown)=>{const text=str(value).trim();if(text){content.headings.push(text);add(text)}}
 const link=(value:unknown)=>{if(str(value))content.links.push(str(value))}
 const image=(value:unknown,fallback?:unknown)=>{
  if(!value)return
  if(typeof fallback==='string'){content.alts.push(fallback);return}
  content.alts.push(value&&typeof value==='object'&&typeof (value as Doc).alt==='string'?(value as Doc).alt:null)
 }
 // Join inline text fragments without inventing spaces in words split by formatting.
 const nodeText=(node:Doc):string=>node.type==='text'?str(node.text):node.type==='linebreak'?'\n':list(node.children).map(nodeText).join('')
 const rich=(value:unknown)=>{
  const root=(value as Doc)?.root
  if(!root)return
  const visit=(node:Doc)=>{
   if(node.type==='heading'){if(node.tag==='h1')content.extraH1++;else if(node.tag==='h2'||node.tag==='h3')content.headings.push(nodeText(node))}
   if(['paragraph','heading','listitem','quote'].includes(node.type)&&!list(node.children).some(x=>['paragraph','heading','listitem','quote','list'].includes(x.type)))paragraph(nodeText(node))
   if(node.type==='link'||node.type==='autolink'){
    const fields=node.fields||node
    if(fields.linkType==='internal'){
     const relation=fields.doc||fields.value
     const record=relation?.value
     if(relation?.relationTo==='pages'&&record?.slug)link('/'+record.slug)
     else if(relation?.relationTo==='cars'&&record?.slug)link('/avtomobili/'+record.slug)
     else if(relation)link('/__editor_internal_relationship__')
    }else link(fields.url||node.url)
   }
   if(node.type==='upload')image(node.value,node.fields?.alt)
   for(const child of list(node.children))visit(child)
  }
  visit(root)
 }
 add(content.h1);paragraph(content.intro)
 if(home){
  const button=(group:Doc,label='button',href='href')=>{if(group[label]&&group[href]){add(group[label]);link(group[href])}}
  const group=(key:string)=>{const value=doc[key]||{};return value.enabled===false?null:value}
  add(doc.hero?.eyebrow);add(doc.hero?.note);image(doc.hero?.image||doc.hero?.imagePath,doc.hero?.imageAlt);button(doc.hero||{});button(doc.hero||{},'secondaryButton','secondaryHref')
  for(const key of ['search','strip','catalogue','price','trust','process','services','dealers','faq','news','community','company','cta']){
   const g=group(key);if(!g)continue
   add(g.eyebrow);heading(g.title);paragraph(g.description);button(g)
   if(key==='search'){add(g.popularLabel);for(const item of list(g.popular))add(item.label)}
   if(key==='strip')for(const item of list(g.items))add(item.label)
   if(key==='catalogue'){paragraph(g.note)} // Dynamic car cards and fallback alternatives are excluded.
   if(key==='price'){
    rich(g.body);button(g,'secondaryButton','secondaryHref')
    const q=doc.commission||{};heading(q.title);add(q.eyebrow);add(q.amount);paragraph(q.description);for(const item of list(q.items))add(item.label);paragraph(q.note);button(q)
   }
   if(key==='trust'){
    for(const p of list(g.photos)){if(p.image||p.path){image(p.image||p.path,p.alt);add(p.caption);link(p.href)}}
    for(const q of list(g.reviews)){paragraph(q.quote);add(q.name);add(q.car)}
    button(g,'googleLabel','googleHref')
   }
   if(key==='process'){for(const step of list(g.steps)){heading(step.title);paragraph(step.text)}rich(g.note);for(const item of list(g.guide)){heading(item.title);rich(item.body)}}
   if(key==='services')for(const item of list(g.items)){heading(item.title);paragraph(item.text);link(item.href)}
   if(key==='dealers'){heading(g.sideTitle);rich(g.sideBody);button(g,'sideButton','sideHref')}
   if(key==='faq'){for(const item of list(g.items)){heading(item.question);rich(item.answer)}rich(g.more)}
   if(key==='community')image(g.image||g.imagePath,g.imageAlt)
   if(key==='company')rich(g.body)
  }
 }else if(car){
  // Intro is the first description paragraph, already counted above.
  for(const p of str(doc.description).split(/\n\s*\n/).slice(1))paragraph(p)
  for(const item of list(doc.features))add(item.label)
  image(doc.image);for(const item of list(doc.gallery))image(item.image)
 }else{
  rich(doc.body)
  for(const section of list(doc.sections)){heading(section.heading);for(const p of str(section.body).split(/\n\s*\n/))paragraph(p)}
  image(doc.image||doc.legacyImage)
 }
 content.text=pieces.join('\n')
 return content
}
export function analyzeSEO(content:SEOContent,siteOrigin='https://koliotamerika.bg'){
 const c=content,checks:SEOCheck[]=[]
 const add=(id:string,label:string,state:SEOCheck['state'],detail:string)=>checks.push({id,label,state,detail})
 const match=(id:string,label:string,value:string,missing:string)=>{
  if(!words(c.phrase).length){add(id,label,'info','Добави основна ключова фраза, за да се направи проверката.');return}
  add(id,label,phraseCount(value,c.phrase)>0?'pass':'review',phraseCount(value,c.phrase)>0?'Фразата присъства.':missing)
 }
 add('title-length','SEO заглавие',c.title.trim()&&c.title.length<=70?'pass':'review',c.title.trim()?c.title.length+' знака · ориентир до 70, показването зависи от ширината на текста.':'Добави описателно SEO заглавие.')
 add('description-length','SEO описание',c.description.trim()&&c.description.length<=180?'pass':'review',c.description.trim()?c.description.length+' знака · ориентир до 180; Google може да избере друг откъс.':'Добави кратко описание на конкретната страница.')
 if(c.fallbackTitle||c.fallbackDescription)add('fallback','Автоматични стойности','info','Празните SEO полета използват заглавието/увода. Прегледът не включва автоматичния суфикс с името на сайта.')
 match('phrase-title','Фраза в SEO заглавието',c.title,'Включи фразата естествено, ако точно описва темата.')
 match('phrase-description','Фраза в SEO описанието',c.description,'Обмисли фразата в описанието, без излишни повторения.')
 match('phrase-h1','Фраза в основното заглавие (H1)',c.h1,'Провери дали H1 ясно назовава темата на страницата.')
 match('phrase-intro','Фраза в увода',c.intro,'Уточни темата още в увода, ако е полезно за читателя.')
 match('phrase-content','Фраза в съдържанието',c.text,'Фразата не е открита в редактираното съдържание.')
 if(c.homepage)add('phrase-url','Фраза в URL','info','Началната страница остава на /. Не е нужен адрес с ключова фраза.')
 else{
  match('phrase-url','Фраза в URL',transliterate(c.path),'Провери дали адресът описва темата. Не променяй публикуван URL само за тази проверка; при промяна е нужно пренасочване.')
  // URL paths use Latin transliteration while editorial copy uses Bulgarian.
  const row=checks.at(-1)!
  if(words(c.phrase).length&&phraseCount(transliterate(c.path),transliterate(c.phrase))){row.state='pass';row.detail='Фразата присъства в URL, включително при транслитерация.'}
 }
 if(c.headings.length)match('phrase-heading','Фраза в подзаглавие',c.headings.join('\n'),'Прецени дали фразата е подходяща за някое H2/H3. Не я добавяй във всяко подзаглавие.')
 else add('phrase-heading','Подзаглавия','info','В редактирания текст няма H2/H3. Добави раздели само ако помагат на читателя.')
 add('h1','Структура на заглавията',!c.h1.trim()||c.extraH1?'review':'pass',!c.h1.trim()?'Липсва основното заглавие.':c.extraH1?'В текста има допълнителен H1. Обмисли H2/H3 за разделите.':'Основното заглавие е попълнено и в редактирания текст няма допълнителен H1.')
 const internal=c.links.filter(href=>{try{const u=new URL(href,siteOrigin);return !href.startsWith('#')&&u.origin===new URL(siteOrigin).origin&&/^https?:$/.test(u.protocol)}catch{return false}}).length
 add('links','Вътрешни връзки',internal?'pass':'info',internal?internal+' вътрешни връзки в редактираното съдържание. Адресите не са проверени за грешка 404.':'Няма намерени вътрешни връзки в редактираното съдържание. Добави полезни препратки, когато са уместни.')
 const unknown=c.alts.filter(x=>x===null).length,empty=c.alts.filter(x=>x!==null&&!x.trim()).length
 add('images','Описания на изображенията',empty?'review':unknown||!c.alts.length?'info':'pass',empty?empty+' изображения са с празно описание; провери дали са декоративни.':unknown?'За '+unknown+' изображения alt текстът не е наличен във формата. Провери го в „Медия“; не се правят допълнителни заявки.':c.alts.length?'Наличните описания са попълнени. Те трябва да описват снимката, без насилено добавяне на фразата.':'Няма изображения за проверка в редактираното съдържание.')
 const long=c.paragraphs.filter(p=>words(p).length>120).length
 add('paragraphs','Четимост',!c.paragraphs.length?'info':long?'review':'pass',!c.paragraphs.length?'Няма абзаци за проверка.':long?long+' дълги абзаца (над 120 думи). Обмисли разделяне за по-лесно четене.':'Няма абзаци над 120 думи. Това е ориентир, а не езикова или Google оценка.')
 if(c.noIndex)add('noindex','Настройка за индексиране','review','Включено е „Скриване от търсачките“. Ако е умишлено, запази настройката. Анализът не я променя.')
 const count=phraseCount(c.text,c.phrase),wordCount=words(c.text).length
 if(count>=4&&count*words(c.phrase).length/Math.max(wordCount,1)>.12)add('repetition','Повторения','review','Фразата заема голяма част от текста. Прочети го за неестествени повторения; няма задължителна SEO плътност.')
 return {checks,words:wordCount,occurrences:count,passed:checks.filter(x=>x.state==='pass').length,applicable:checks.filter(x=>x.state!=='info').length}
}
