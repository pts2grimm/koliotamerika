import { createHash } from 'node:crypto'
import { defaultSettings, type SocialSettings } from './types'
export class SocialError extends Error { constructor(message:string,public status=400){super(message)} }
export function text(value:unknown,max:number,required=true) {
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new SocialError('Провери задължителните полета и дължината на текста.')
 return value.trim()
}
export function siteLink(value:unknown) {
 const url=new URL(text(value,500), 'https://koliotamerika.bg')
 if(url.origin!=='https://koliotamerika.bg'||url.username||url.password||url.hash||(!/^\/[a-z0-9]+(?:[-/][a-z0-9]+)*\/?$/.test(url.pathname)||/^\/(?:api|admin|profil|vhod|registracia|nova-parola|zabravena-parola)(?:\/|$)/.test(url.pathname)))throw new SocialError('Използвай публичен линк от koliotamerika.bg.')
 return url.href
}
export function vehicleLink(value:unknown) {
 const url=new URL(siteLink(value))
 const lot=url.searchParams.get('lot')||'', site=url.searchParams.get('site')||'1'
 if(url.pathname!=='/targove/kola'||!/^\d{5,12}$/.test(lot)||!['1','2'].includes(site))throw new SocialError('Невалиден линк за автомобил.')
 return {lot,site,link:'https://koliotamerika.bg/targove/kola?'+new URLSearchParams({lot,site})}
}
export function sourceKey(kind:string,source:string){return createHash('sha256').update(kind+'\0'+source).digest('hex')}
export function settingsInput(body:Record<string,unknown>,current=defaultSettings):SocialSettings {
 const weekdays=body.weekdays
 if(!Array.isArray(weekdays)||!weekdays.length||weekdays.length>7||weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(weekdays).size!==weekdays.length)throw new SocialError('Избери дни от седмицата.')
 const time=text(body.time,5)
 if(!/^(?:0[6-9]|1\d|2[0-2]):[0-5]\d$/.test(time))throw new SocialError('Избери час между 06:00 и 22:59 по българско време.')
 if(typeof body.prepare!=='boolean'||typeof body.enabled!=='boolean')throw new SocialError('Невалидна настройка.')
 const vehicles=body.vehicles
 if(!Array.isArray(vehicles)||vehicles.length>20)throw new SocialError('Добави до 20 избрани автомобила.')
 return {...current,prepare:body.prepare,enabled:body.enabled,time,weekdays:[...weekdays].sort(),vehicles:[...new Set(vehicles.map(v=>vehicleLink(v).link))]}
}
export const sofiaDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export function sofiaLocal(iso:string) {
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso)).replace(' ','T')
}
export function sofiaInstant(value:unknown) {
 const local=text(value,16)
 if(!/^\d{4}-\d{2}-\d{2}T(?:0[6-9]|1\d|2[0-2]):[0-5]\d$/.test(local))throw new SocialError('Избери дата и час между 06:00 и 22:59 по българско време.')
 const guess=Date.parse(local+'Z')
 if(!Number.isFinite(guess))throw new SocialError('Невалидна дата.')
 for(const offset of [2,3]){const iso=new Date(guess-offset*3600000).toISOString();if(sofiaLocal(iso)===local)return iso}
 throw new SocialError('Невалидна дата.')
}
export function nextSlots(settings:SocialSettings,now=Date.now()) {
 const today=sofiaDate(new Date(now)), slots:string[]=[]
 for(let i=0;i<7;i++){
  const day=new Date(today+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+i)
  if(settings.weekdays.includes(day.getUTCDay())){const slot=sofiaInstant(day.toISOString().slice(0,10)+'T'+settings.time);if(Date.parse(slot)>now+600000)slots.push(slot)}
 }
 return slots
}
export function scheduledDate(value:unknown,now=Date.now()){
 const iso=sofiaInstant(value),delta=Date.parse(iso)-now
 if(delta<600000||delta>90*86400000)throw new SocialError('Избери час поне 10 минути напред и до 90 дни.')
 return iso
}
