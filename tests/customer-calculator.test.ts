import { formatCurrency } from '../src/lib/currency'
import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { calculateImport } from '../src/lib/calculate'
import { exampleCosts, purchaseFee, onlineFee } from '../src/lib/customer-tariff'
import { clarifyCopy } from '../src/lib/clarity-copy'
import pricing from '../content/customer-pricing-2026-10.json'
test('calculator excludes removed charges and uses the updated delivery default',()=>{
 const result=calculateImport(10000,500,1000,exampleCosts)!
 assert.equal(exampleCosts.deliveryEur,1000)
 assert.equal(result.totalEur,18110.92)
 assert.equal(result.subtotalUsd,13090)
 assert.equal(result.subtotalEur,11781)
 assert.equal(result.customsEur,11781)
 assert.equal(result.vatBaseEur,14259.1)
 assert.equal(result.dutyEur,1178.1)
 assert.equal(result.vatEur,2851.82)
 assert.equal(result.commissionEur,1000)
 assert.deepEqual(result.rows.map(row=>[row.label,row.usd]),[
  ['Автомобил',10000],['Такси на аукциона',1390],['Вътрешен транспорт в САЩ',500],
  ['Морски транспорт',1000],['Застраховка — примерен бюджет',200],
 ])
 // Archived document settings have no effect on totals or input validity.
 assert.deepEqual(calculateImport(10000,500,1000,{...exampleCosts,documentUsd:9999}),result)
 assert.deepEqual(calculateImport(10000,500,1000,{...exampleCosts,documentUsd:NaN}),result)
 // The auction fee table itself is unchanged.
 const doc=new JSDOM(pricing[0].html)
 const number=(s:string)=>Number(s.replace(/[^0-9.]/g,''))
 for(const row of [...doc.window.document.querySelectorAll('table')[0].querySelectorAll('tr')].slice(1)){
  const cells=row.querySelectorAll('td')
  assert.equal(purchaseFee(number(cells[0].textContent!)),number(cells[1].textContent!))
 }
 doc.window.close()
})
test('manual customs valuation changes taxes without replacing actual costs',()=>{
 const result=calculateImport(10000,500,1000,exampleCosts,10000)!
 assert.equal(result.subtotalEur,11781)
 assert.equal(result.customsEur,10000)
 assert.equal(result.dutyEur,1000)
 assert.equal(result.vatBaseEur,12300)
 assert.equal(result.vatEur,2460)
 assert.equal(result.totalEur,17541)
 const higherFreight=calculateImport(10000,600,1000,exampleCosts,10000)!
 assert.equal(higherFreight.customsEur,10000)
 assert.equal(higherFreight.dutyEur,result.dutyEur)
 assert.equal(higherFreight.vatEur,result.vatEur)
 assert.equal(higherFreight.totalEur-result.totalEur,90)
 for(const value of [-1,NaN,Infinity,10000001]) assert.equal(calculateImport(10000,500,1000,exampleCosts,value),null)
 assert.ok(calculateImport(10000,500,1000,exampleCosts,0))
})
test('tariff boundaries, invalid values and zero transport cannot silently underprice',()=>{
 assert.equal(purchaseFee(999.99),370);assert.equal(purchaseFee(1000),440)
 assert.equal(purchaseFee(2399.99),662.5);assert.equal(purchaseFee(2400),705)
 assert.equal(purchaseFee(11499.99),1390);assert.equal(purchaseFee(11500),1400)
 assert.equal(purchaseFee(14999.99),1400);assert.equal(purchaseFee(15000),1875)
 assert.equal(purchaseFee(20000),2500)
 assert.equal(onlineFee(7999.99),145);assert.equal(onlineFee(8000),160)
 for(const price of [0,-1,NaN,Infinity,500001])assert.equal(calculateImport(price,500,1000,exampleCosts),null)
 for(const value of [-1,NaN,Infinity,100001])assert.equal(calculateImport(10000,value,1000,exampleCosts),null)
 assert.equal(calculateImport(10000,500,1000,{...exampleCosts,usdToEur:0}),null)
 assert.equal(calculateImport(10000,500,1000,{...exampleCosts,insuranceUsd:NaN}),null)
 assert.ok(calculateImport(10000,0,0,exampleCosts))
 const base=calculateImport(10000,500,1000,exampleCosts)!
 const increased=calculateImport(10000,600,1000,exampleCosts)!
 assert.equal(Math.round((increased.totalEur-base.totalEur)*100),11880) // €90 + 10% duty + 20% VAT.
})
test('commercial clarification preserves custom copy and formatting and is repeatable',()=>{
 const before={root:{children:[{type:'text',text:'My manual wording',format:1},{type:'link',url:'/keep',children:[{type:'text',text:'Ако се изисква депозит, неговото предназначение и приспадане се описват в договора.',format:2}]}]}}
 const after=clarifyCopy(before)
 assert.equal(before.root.children[1].children![0].text,'Ако се изисква депозит, неговото предназначение и приспадане се описват в договора.')
 assert.equal(after.root.children[0].text,'My manual wording')
 assert.equal(after.root.children[1].url,'/keep')
 assert.equal(after.root.children[1].children![0].format,2)
 assert.match(after.root.children[1].children![0].text,/невъзвръщаемата комисионна/)
 assert.deepEqual(clarifyCopy(after),after)
})

test('USD uses $ while CAD and EUR remain unambiguous',()=>{
 assert.match(formatCurrency(95,'USD'),/95,00\s*\$/)
 assert.doesNotMatch(formatCurrency(95,'USD'),/щ/)
 assert.match(formatCurrency(95,'USD',0),/95\s*\$/)
 assert.match(formatCurrency(95,'CAD'),/CAD/)
 assert.match(formatCurrency(95,'EUR'),/€/)
})
