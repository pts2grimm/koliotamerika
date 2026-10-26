import type { ComponentProps } from 'react'
import type { Media } from '../payload-types'
import type { EditorialContent } from '../components/EditorialContent'
import { homeFields } from '../globals/home-fields'
import { mediaUrl } from './data'
import { homeLink } from './home-links'
type RichData=ComponentProps<typeof EditorialContent>['data']
export type HomeContent={seo:{title:string;description:string;image:number|Media|null;imageAlt:string};
hero:{eyebrow:string;title:string;description:string;image:number|Media|null;imagePath:string;imageAlt:string;note:string;button:string;href:string;secondaryButton:string;secondaryHref:string};
search:{enabled:boolean;eyebrow:string;title:string;button:string;popularLabel:string;popular:({id?:string;label:string})[]};
strip:{enabled:boolean;items:({id?:string;label:string})[]};
catalogue:{enabled:boolean;eyebrow:string;title:string;emptyTitle:string;description:string;emptyDescription:string;button:string;href:string;auctionHref:string;note:string;fallbackEyebrow:string;fallbackTitle:string;fallbackText:string;fallbackButton:string;artLabel:string};
price:{enabled:boolean;eyebrow:string;title:string;body:RichData|null;button:string;href:string;secondaryButton:string;secondaryHref:string};
commission:{eyebrow:string;title:string;amount:string;description:string;items:({id?:string;label:string})[];note:string;button:string;href:string};
trust:{enabled:boolean;eyebrow:string;title:string;description:string;button:string;href:string;photos:({id?:string;image:number|Media|null;path:string;caption:string;alt:string;href:string})[];reviews:({id?:string;name:string;car:string;quote:string})[];googleLabel:string;googleHref:string};
process:{enabled:boolean;eyebrow:string;title:string;button:string;href:string;steps:({id?:string;title:string;text:string})[];note:RichData|null;guide:({id?:string;title:string;body:RichData|null})[]};
services:{enabled:boolean;eyebrow:string;title:string;button:string;href:string;items:({id?:string;title:string;text:string;href:string})[]};
dealers:{enabled:boolean;eyebrow:string;title:string;description:string;button:string;href:string;sideTitle:string;sideBody:RichData|null;sideButton:string;sideHref:string};
faq:{enabled:boolean;eyebrow:string;title:string;items:({id?:string;question:string;answer:RichData|null})[];more:RichData|null};
news:{enabled:boolean;eyebrow:string;title:string;button:string;href:string;readMore:string};
community:{enabled:boolean;eyebrow:string;title:string;description:string;button:string;href:string;image:number|Media|null;imagePath:string;imageAlt:string};
company:{enabled:boolean;body:RichData|null};
cta:{enabled:boolean;eyebrow:string;title:string;description:string;button:string;href:string}}
export function resolveHome(doc:unknown):HomeContent{
 function walk(fields:any[],value:any):any{return Object.fromEntries(fields.map(f=>{
 const v=value?.[f.name]
 return [f.name,f.type==='group'?walk(f.fields,v):f.type==='array'?(Array.isArray(v)?v.map(x=>({...walk(f.fields,x),id:x.id})):[]):f.type==='richText'?(v?.root?v:null):f.type==='upload'?(v??null):f.type==='checkbox'?v!==false:typeof v==='string'?v:'']
 }))}
 return walk(homeFields,doc)
}
export function homeImage(image:number|Media|null,path=''){return mediaUrl(image)||(path.startsWith('/')&&homeLink(path)?path:undefined)}
export function richPlain(value:unknown):string{
 if(!value||typeof value!=='object')return ''
 const node=value as {root?:unknown;text?:unknown;children?:unknown[]}
 if(node.root)return richPlain(node.root)
 if(typeof node.text==='string')return node.text
 return (node.children||[]).map(richPlain).join(' ').replace(/\s+/g,' ').trim()
}
