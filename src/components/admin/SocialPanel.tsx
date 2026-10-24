'use client'
import { useEffect,useState } from 'react'
import { kindLabels,statusLabels,type SocialKind,type SocialPost,type SocialSettings } from '@/lib/social/types'
type Data={posts:SocialPost[];hasNext:boolean;page:number;settings:SocialSettings;settingsRevision:number;lastTick:string;articles:{title:string;slug:string}[];tips:{title:string;message:string;link:string}[];connection:{configured:boolean;pageId:string;cronConfigured:boolean}}
const local=(value:string)=>value?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T'):''
const date=(value:string)=>value?new Intl.DateTimeFormat('bg-BG',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Sofia'}).format(new Date(value)):'—'
const errors:Record<string,string>={SOURCE_UNAVAILABLE:'Материалът вече не е достъпен или проверката не завърши.',PAGE_CHANGED:'Свързаната страница е сменена. Нужно е ново одобрение.',MISSED_WINDOW:'Часът е пропуснат с повече от 30 минути. Избери нов час.',WORKER_INTERRUPTED:'Изпращането е прекъснато. Провери дали постът е във Facebook.',META_CONNECTION_UNCERTAIN:'Няма сигурно потвърждение от Meta. Провери страницата.',META_RESPONSE_UNCERTAIN:'Meta върна неясен отговор. Провери страницата.'}
type Act=(body:Record<string,unknown>)=>Promise<void>
function Post({post,act,busy,connected}:{post:SocialPost;act:Act;busy:boolean;connected:boolean}){
 const [message,setMessage]=useState(post.message),[scheduled,setScheduled]=useState(local(post.scheduled_at)),[facebookId,setFacebookId]=useState(''),[absent,setAbsent]=useState(false)
 const editable=['draft','scheduled','failed','cancelled'].includes(post.status)
 const dirty=message!==post.message||scheduled!==local(post.scheduled_at)
 const action=(name:string,extra:Record<string,unknown>={})=>act({action:name,id:post.id,revision:post.revision,...extra})
 return <article className="koa-social__post">
  <div className="koa-social__post-heading"><div><small>{kindLabels[post.kind]}</small><h3>{post.title}</h3></div><strong className={'koa-social__status koa-social__status--'+post.status}>{statusLabels[post.status]}</strong></div>
  <p>Планирано: <strong>{date(post.scheduled_at)}</strong> · Българско време</p>
  <a href={post.link} target="_blank" rel="noopener noreferrer">Отвори материала ↗</a>
  {post.facebook_id&&<p><a href={'https://www.facebook.com/'+post.facebook_id} target="_blank" rel="noopener noreferrer">Виж публикацията във Facebook ↗</a></p>}
  {post.error_code&&<p role="status">{errors[post.error_code]||'Meta отказа заявката. Провери достъпа и разрешенията на страницата.'} <small>{post.error_code}</small></p>}
  <details open={post.status==='draft'}><summary>Текст и управление</summary>
   <label>Текст на публикацията<textarea rows={6} maxLength={2000} value={message} disabled={!editable||busy} onChange={e=>setMessage(e.target.value)}/></label>
   <p className="koa-social__muted">Линкът ще бъде приложен към поста. Изображението за преглед се определя от Facebook; не качваме отделни чужди снимки.</p>
   {editable&&<><label>Дата и час · Europe/Sofia<input type="datetime-local" value={scheduled} disabled={busy} onChange={e=>setScheduled(e.target.value)}/></label>
    <div className="koa-overview__actions">
     <button disabled={busy||!message.trim()} onClick={()=>void action('edit',{message,date:scheduled})}>Запази като чернова</button>
     {post.status==='draft'&&<button disabled={busy||dirty||!scheduled||!connected} onClick={()=>void action('approve')}>Одобри за публикуване</button>}
     {post.status!=='cancelled'&&<button disabled={busy} onClick={()=>void action('cancel')}>Отмени</button>}
    </div>{dirty&&<p>Запази промените преди одобрение. Редакцията отменя предишното одобрение.</p>}</>}
   {post.status==='uncertain'&&<div className="koa-social__reconcile"><p>Провери Facebook страницата, преди да разрешиш ново изпращане.</p><label>Post ID, ако публикацията вече е там<input value={facebookId} onChange={e=>setFacebookId(e.target.value)} placeholder="PageID_PostID"/></label><label className="koa-social__check"><input type="checkbox" checked={absent} onChange={e=>setAbsent(e.target.checked)}/>Проверих страницата и публикацията липсва</label><button disabled={busy||(!facebookId&&!absent)} onClick={()=>void action('reconcile',{facebookId,confirmAbsent:absent})}>Запази резултата от проверката</button></div>}
   <p className="koa-social__muted">Одобрено: {date(post.approved_at)} · Публикувано: {date(post.published_at)}</p>
  </details>
 </article>
}
export function SocialPanel(){
 const [data,setData]=useState<Data|null>(null),[settings,setSettings]=useState<SocialSettings|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(1)
 const [kind,setKind]=useState<SocialKind>('article'),[source,setSource]=useState(''),[message,setMessage]=useState('')
 async function refresh(target=page){
  const response=await fetch('/api/admin/social?page='+target,{cache:'no-store',credentials:'same-origin'})
  const next=await response.json();if(!response.ok)throw new Error(next.error||'Неуспешно зареждане.')
  setData(next);setSettings(next.settings);setPage(target)
 }
 useEffect(()=>{void refresh(1).catch(e=>setError(e.message))},[])
 const act:Act=async body=>{
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/admin/social',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)})
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Неуспешно действие.')
   await refresh();setNotice(body.action==='prepare'?'Подготвени: '+result.created+'. Незапълнени места: '+result.unfilled+'. Добави нови статии или избрани автомобили при нужда.':'Запазено.')
  }catch(e){setError(e instanceof Error?e.message:'Неуспешно действие.')}finally{setBusy(false)}
 }
 if(!data||!settings)return <section><p role={error?'alert':'status'}>{error||'Зареждане…'}</p><button onClick={()=>void refresh().catch(e=>setError(e.message))}>Опитай отново</button></section>
 const connected=data.connection.configured&&settings.verifiedPageId===data.connection.pageId
 return <section>
  <div className="koa-overview__actions"><button disabled={busy} onClick={()=>{setBusy(true);void refresh().catch(e=>setError(e.message)).finally(()=>setBusy(false))}}>Обнови</button><button disabled={busy} onClick={()=>void act({action:'prepare'})}>Подготви следващите 7 дни</button></div>
  {error&&<p role="alert" className="koa-social__alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <div className="koa-social__grid">
   <section className="koa-social__panel"><h2>Facebook страница</h2><p><a href="https://www.facebook.com/koliotamerika" target="_blank" rel="noopener noreferrer">facebook.com/koliotamerika ↗</a></p><p>{connected?settings.verifiedPageName+' · '+settings.verifiedPageId:'Няма потвърдена Facebook страница'}</p><p>Публикуване: <strong>{settings.enabled?'Включено':'На пауза'}</strong></p><p>Последна проверка на графика: {date(data.lastTick)}</p>
    <button disabled={busy||!data.connection.configured} onClick={()=>void act({action:'verify'})}>Провери връзката с Meta</button>
    {!data.connection.configured&&<p>Нужни са Page ID и Page Access Token в настройките на хостинга. Токенът не се въвежда в публикациите.</p>}
    {!data.connection.cronConfigured&&<p>Автоматичният график още не е свързан. Черновите могат да се подготвят ръчно.</p>}
    <p className="koa-social__muted">Публикуват се само одобрени постове. Проверка през 15 минути; външният график може да закъснее. При закъснение над 30 минути постът чака нов преглед.</p>
   </section>
   <section className="koa-social__panel"><h2>График</h2>
    <label className="koa-social__check"><input type="checkbox" checked={settings.prepare} onChange={e=>setSettings({...settings,prepare:e.target.checked})}/>Автоматично подготвяне на чернови</label>
    <label className="koa-social__check"><input type="checkbox" checked={settings.enabled} disabled={!connected||!data.connection.cronConfigured} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/>Публикуване на одобрените постове</label>
    <fieldset><legend>Дни от седмицата</legend><div className="koa-social__days">{['Нд','Пн','Вт','Ср','Чт','Пт','Сб'].map((name,i)=><label key={name}><input type="checkbox" checked={settings.weekdays.includes(i)} onChange={e=>setSettings({...settings,weekdays:e.target.checked?[...settings.weekdays,i]:settings.weekdays.filter(d=>d!==i)})}/>{name}</label>)}</div></fieldset>
    <label>Час · България<input type="time" min="06:00" max="22:59" value={settings.time} onChange={e=>setSettings({...settings,time:e.target.value})}/></label>
    <label>Избрани автомобили · по един линк на ред<textarea rows={3} value={settings.vehicles.join('\n')} onChange={e=>setSettings({...settings,vehicles:e.target.value.split('\n')})}/></label>
    <button disabled={busy} onClick={()=>void act({action:'settings',settings:{...settings,vehicles:settings.vehicles.map(v=>v.trim()).filter(Boolean)},revision:data.settingsRevision})}>Запази графика</button>
    <p className="koa-social__muted">Редуват се статии, избрани автомобили и съвети. Вече добавен материал не се повтаря. Новият график не мести готови чернови или одобрени постове.</p>
   </section>
  </div>
  <section className="koa-social__panel"><h2>Нова публикация</h2><div className="koa-social__grid">
   <label>Тип<select aria-label="Тип" value={kind} onChange={e=>{setKind(e.target.value as SocialKind);setSource('');setMessage('')}}>{Object.entries(kindLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   {kind==='article'?<label>Публикувана статия<select aria-label="Публикувана статия" value={source} onChange={e=>setSource(e.target.value)}><option value="">Избери статия</option>{data.articles.map(a=><option key={a.slug} value={a.slug}>{a.title}</option>)}</select></label>:kind==='vehicle'?<label>Линк към автомобил<input type="url" value={source} onChange={e=>setSource(e.target.value)} placeholder="https://koliotamerika.bg/targove/kola?lot=…&site=1"/></label>:<label>Линк<select aria-label="Линк" value={source||'https://koliotamerika.bg/blog/'} onChange={e=>setSource(e.target.value)}><option value="https://koliotamerika.bg/blog/">Блог</option><option value="https://koliotamerika.bg/kalkulator">Калкулатор</option><option value="https://koliotamerika.bg/kontakti">Контакти</option></select></label>}
  </div>{kind==='tip'&&<><div className="koa-overview__actions">{data.tips.map(t=><button key={t.title} onClick={()=>{setMessage(t.message);setSource(t.link)}}>{t.title}</button>)}</div><label>Практически съвет<textarea rows={5} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/></label></>}
   <button disabled={busy||(kind==='tip'?!message.trim():!source)} onClick={()=>void act({action:'create',kind,source:source||'https://koliotamerika.bg/blog/',message})}>Създай чернова</button>
  </section>
  <h2>Публикации и история</h2>{!data.posts.length&&<p>Все още няма публикации. Създай чернова или подготви следващите 7 дни.</p>}
  <div className="koa-social__posts">{data.posts.map(post=><Post key={post.id+':'+post.revision} post={post} act={act} busy={busy} connected={connected}/>)}</div>
  <div className="koa-overview__actions"><button disabled={busy||page===1} onClick={()=>void refresh(page-1).catch(e=>setError(e.message))}>Предишна</button><span>Страница {page}</span><button disabled={busy||!data.hasNext} onClick={()=>void refresh(page+1).catch(e=>setError(e.message))}>Следваща</button></div>
 </section>
}
