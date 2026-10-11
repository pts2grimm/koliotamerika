import test from 'node:test'
import assert from 'node:assert/strict'
import type { Page } from '../src/payload-types'
import revisions from '../content/services-review-2026-10.json'
import { servicesReviewUpdate } from '../src/lib/services-review-upgrade'

test('service text updates do not overwrite custom intros or SEO options',()=>{
 const r=revisions.find(x=>x.slug==='homologacia')!
 const oldBody={root:{children:[{type:'paragraph',children:[{type:'text',text:'Previous body'}]}]}} as unknown as Page['body']
 const newBody={root:{children:[{type:'paragraph',children:[{type:'text',text:'Updated body'}]}]}} as unknown as Page['body']
 const page={body:oldBody,sections:[],intro:'Custom intro',seo:{title:'Custom SEO',description:'Custom description',noIndex:true}} as Page
 const update=servicesReviewUpdate(page,{applied:{body:oldBody}},r,newBody)
 assert.deepEqual(update,{body:newBody})
 const withSections={...page,sections:[{id:'manual',heading:'Additional service',body:'Keep me'}]}
 assert.deepEqual(servicesReviewUpdate(withSections,{applied:{body:oldBody}},r,newBody),{})
})

test('seed section comparison ignores only row IDs and preserves edited rows',()=>{
 const r=revisions.find(x=>x.slug==='uslugi')!
 const prior={applied:{sections:[{id:'old-id',heading:'Step',body:'Text'}]}}
 const page={body:null,sections:[{id:'new-id',heading:'Step',body:'Text'}],intro:'Custom',seo:{description:'Custom'}} as Page
 const body={root:{children:[]}} as unknown as Page['body']
 assert.deepEqual(servicesReviewUpdate(page,prior,r,body),{body,sections:[]})
 assert.deepEqual(servicesReviewUpdate({...page,sections:[{heading:'Step',body:'Edited'}]},prior,r,body),{})
 assert.deepEqual(servicesReviewUpdate(page,{},r,body),{})
})
