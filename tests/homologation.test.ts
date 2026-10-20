import assert from 'node:assert/strict'
import { test } from 'node:test'
import { homologationCopy, homologationHref, homologationText, retiredArticle } from '../src/lib/homologation-copy'
import { homologationPageUpdate } from '../src/lib/homologation-upgrade'
import type { Page } from '../src/payload-types'
import previous from '../content/services-review-2026-10.json'
import revision from '../content/homologation-review-2026-10.json'
test('terminology cleanup retains tree identity, formatting, dates and unrelated destinations',()=>{
 const input={id:4,slug:'safe',sourceURL:'https://koliotamerika.bg/tehnotest/',status:'draft',publishedAt:'2099-01-01',body:{root:{children:[{type:'link',id:'stable-link',fields:{url:'https://www.koliotamerika.bg/tehnotest/?x=1#info'},children:[{type:'text',text:'Технотест',format:1}]}]}}}
 const result=homologationCopy(input)
 assert.equal(result.body.root.children[0].children[0].text,'Индивидуално одобряване')
 assert.equal(result.body.root.children[0].fields.url,'/homologacia?x=1#info')
 assert.equal(result.body.root.children[0].id,'stable-link')
 assert.equal(result.body.root.children[0].children[0].format,1)
 for(const key of ['id','slug','sourceURL','status','publishedAt'] as const)assert.equal(result[key],input[key])
 assert.equal(input.body.root.children[0].children[0].text,'Технотест')
 assert.deepEqual(homologationCopy(result),result)
 for(const value of ['https://other.example/tehnotest','mailto:office@example.com','/kontakti'])assert.equal(homologationHref(value),value)
 assert.equal(homologationText('успешен технотест'),'успешно индивидуално одобряване')
})
test('service revision applies only to known baseline and preserves editorial overrides',()=>{
 const old=previous.find(x=>x.slug==='homologacia')!
 const body={root:{children:[{type:'text',text:'Baseline'}]}} as unknown as Page['body']
 const next={root:{children:[{type:'text',text:'New'}]}} as unknown as Page['body']
 const page={createdAt:'2026-10-20T00:00:00Z',updatedAt:'2026-10-20T00:00:00Z',id:1,slug:'homologacia',title:old.expectedTitle,intro:old.intro,body,sections:[],status:'draft',publishedAt:'2099-01-01',image:6,seo:{title:old.expectedSEOtitle,description:old.seoDescription,image:7,noIndex:true}} as Page
 const legacyImage=homologationPageUpdate({...page,legacyImage:'/wp-content/uploads/2022/09/tehnotest.jpg'},body,next)
 assert.equal(legacyImage.legacyImage,'/images/legacy/wp-2809.jpg')
 const data=homologationPageUpdate(page,body,next)
 assert.deepEqual(data.body,next)
 assert.equal(data.title,revision.title)
 assert.equal(data.seo?.image,7);assert.equal(data.seo?.noIndex,true)
 for(const field of ['id','slug','status','publishedAt','image'] as const)assert.equal(data[field],undefined)
 const custom={...page,title:'Наше заглавие',intro:'Наш текст',body:next,seo:{title:'Наше SEO',description:'Наше описание'}}
 assert.deepEqual(homologationPageUpdate(custom,body,body),{})
})
test('retired article becomes a private archived record without changing date or identity',()=>{
 const page={createdAt:'2026-10-20T00:00:00Z',updatedAt:'2026-10-20T00:00:00Z',id:2,slug:retiredArticle,title:'Технотест за автомобили',intro:'Технотест',status:'published',publishedAt:'2025-09-08',seo:{noIndex:false}} as Page
 const result=homologationPageUpdate(page,undefined,undefined)
 assert.equal(result.status,'draft')
 assert.equal(result.publishedAt,undefined);assert.equal(result.slug,undefined)
 assert.doesNotMatch(JSON.stringify(result),/технотест|tehnotest|technotest/i)
 assert.ok(revision.seo.title.length<=70&&revision.seo.description.length<=180)
})
