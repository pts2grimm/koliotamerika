import test from 'node:test'
import assert from 'node:assert/strict'
import { galleryReviewUpdate } from '../src/lib/gallery-review-upgrade'
import type { Page } from '../src/payload-types'
const body=(text:string):Page['body']=>({root:{type:'root',format:'',indent:0,version:1,direction:null,children:[{type:'paragraph',version:1,children:[{type:'text',version:1,text}]}]}})
test('gallery cleanup recognizes the reviewed body and preserves manual edits and sections',()=>{
 const before=body('Original gallery captions'),after=body('New supporting copy')
 assert.deepEqual(galleryReviewUpdate({body:before,sections:[]},before,after),{body:after})
 assert.deepEqual(galleryReviewUpdate({body:body('My gallery description'),sections:[]},before,after),{})
 assert.deepEqual(galleryReviewUpdate({body:before,sections:[{heading:'My section',body:'Do not remove'}]},before,after),{})
 assert.deepEqual(galleryReviewUpdate({body:before,sections:[]},undefined,after),{})
})
