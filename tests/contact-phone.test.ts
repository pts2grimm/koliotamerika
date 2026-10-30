import assert from 'node:assert/strict'
import test from 'node:test'
import { contactPhone, contactPhoneCopy, contactPhonePatch, replaceContactPhone } from '../src/lib/contact-phone'
test('business number replacements cover display, local and dial links only', () => {
 for (const old of ['+359 888 292 280','+359888292280','0888 292 280','00359 888 292 280','+359 88 829 2280','+359\u00a0888\u00a0292\u00a0280'])
  assert.equal(replaceContactPhone('Обади се: '+old), 'Обади се: '+contactPhone)
 assert.equal(replaceContactPhone('<a href="tel:+359888292280">+359888292280</a>'), '<a href="tel:+359884478885">'+contactPhone+'</a>')
 assert.equal(replaceContactPhone('sms:0888292280'), 'sms:+359884478885')
 for (const other of ['+359 884 478 885','+359 888 292 281','+3598882922801','100359888292280','+1 555 123 4567'])
  assert.equal(replaceContactPhone(other),other)
})
test('rich text and selected public fields preserve IDs, media, custom text and publication state', () => {
 const before={id:'0888292280',slug:'keep',status:'draft',publishedAt:'2027-01-01T00:00:00Z',intro:'Редакторски текст',body:{root:{type:'root',version:1,children:[
  {type:'link',id:'0888292280',fields:{url:'tel:+359888292280'},children:[{type:'text',text:'Телефон: +359 888 292 280',format:1}]},
  {type:'upload',relationTo:'media',value:'0888292280'},
 ]}},seo:{description:'Друг телефон +359 888 292 281',image:'0888292280',noIndex:true}}
 const saved=structuredClone(before)
 const patch=contactPhonePatch(before,['intro','body','seo'])
 assert.deepEqual(Object.keys(patch),['body'])
 assert.equal(patch.body!.root.children[0].fields!.url,'tel:+359884478885')
 assert.equal(patch.body!.root.children[0].children![0].text,'Телефон: '+contactPhone)
 assert.equal(patch.body!.root.children[0].id,'0888292280')
 assert.equal(patch.body!.root.children[1].value,'0888292280')
 assert.deepEqual(before,saved)
 assert.deepEqual(contactPhoneCopy(contactPhoneCopy(before)),contactPhoneCopy(before))
})
